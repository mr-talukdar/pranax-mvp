import 'server-only';

import { Prisma, withVerifiedStudioContext } from '@pranax/database';
import type {
  DefaultPlanType,
  MembershipCancel,
  MembershipCreate,
  MembershipPause,
  MembershipPeriodDetail,
  MembershipRenew,
  MembershipResume,
} from '@pranax/contracts';
import {
  membershipCancelSchema,
  membershipCreateSchema,
  membershipPauseSchema,
  membershipRenewSchema,
  membershipResumeSchema,
} from '@pranax/contracts';
import type { StudioContext } from '../auth/context';
import {
  InvalidMembershipStateError,
  MemberNotFoundError,
  MembershipConflictError,
  MembershipNotFoundError,
  ServiceError,
} from './errors';
import {
  addCalendarDays,
  calendarDateToUtcDate,
  calendarDaysBetween,
  dateToCalendarDate,
  getStudioLocalDate,
} from '../utils/dates';
import { triggerMemberRetentionReassessment } from './retentionTrigger';

const DEFAULT_PLANS: Record<
  DefaultPlanType,
  { name: string; durationDays: number; priceCents: number }
> = {
  MONTHLY: { name: 'Monthly', durationDays: 30, priceCents: 15000 },
  QUARTERLY: { name: 'Quarterly', durationDays: 90, priceCents: 40000 },
  ANNUAL: { name: 'Annual', durationDays: 365, priceCents: 140000 },
};

async function resolvePlan(
  tx: Prisma.TransactionClient,
  studioId: string,
  planId?: string,
  planType?: DefaultPlanType,
): Promise<{ id: string; name: string; durationDays: number; priceCents: number }> {
  if (planId) {
    const plan = await tx.membershipPlan.findFirst({
      where: { id: planId, studioId },
      select: { id: true, name: true, durationDays: true, priceCents: true },
    });
    if (!plan) {
      throw new ServiceError(`Membership plan "${planId}" not found in this studio.`, 404, 'PLAN_NOT_FOUND');
    }
    return plan;
  }

  const type = planType || 'MONTHLY';
  const planConfig = DEFAULT_PLANS[type];
  const existing = await tx.membershipPlan.findFirst({
    where: { studioId, name: planConfig.name },
    select: { id: true, name: true, durationDays: true, priceCents: true },
  });
  if (existing) {
    return existing;
  }

  return tx.membershipPlan.create({
    data: {
      studioId,
      name: planConfig.name,
      durationDays: planConfig.durationDays,
      priceCents: planConfig.priceCents,
    },
    select: { id: true, name: true, durationDays: true, priceCents: true },
  });
}

function mapPeriodDetail(period: {
  id: string;
  memberId: string;
  planId: string;
  startsAt: Date;
  originalEndsAt: Date;
  effectiveEndsAt: Date;
  status: 'ACTIVE' | 'PAUSED' | 'EXPIRED' | 'CANCELLED';
  renewedFromId: string | null;
  cancelledAt: Date | null;
  createdAt: Date;
  plan: { name: string; durationDays: number; priceCents: number };
  pauses: Array<{
    id: string;
    startsAt: Date;
    resumesAt: Date | null;
    createdAt: Date;
  }>;
}): MembershipPeriodDetail {
  return {
    id: period.id,
    memberId: period.memberId,
    planId: period.planId,
    planName: period.plan.name,
    durationDays: period.plan.durationDays,
    priceCents: period.plan.priceCents,
    startsAt: dateToCalendarDate(period.startsAt),
    originalEndsAt: dateToCalendarDate(period.originalEndsAt),
    effectiveEndsAt: dateToCalendarDate(period.effectiveEndsAt),
    status: period.status,
    renewedFromId: period.renewedFromId,
    cancelledAt: period.cancelledAt ? period.cancelledAt.toISOString() : null,
    createdAt: period.createdAt.toISOString(),
    pauses: period.pauses.map((p) => ({
      id: p.id,
      startsAt: dateToCalendarDate(p.startsAt),
      resumesAt: p.resumesAt ? dateToCalendarDate(p.resumesAt) : null,
      durationDays: p.resumesAt
        ? calendarDaysBetween(
            dateToCalendarDate(p.startsAt),
            dateToCalendarDate(p.resumesAt),
          )
        : null,
      createdAt: p.createdAt.toISOString(),
    })),
  };
}

export async function createMembership(
  context: StudioContext,
  memberId: string,
  input: MembershipCreate,
): Promise<MembershipPeriodDetail> {
  const validated = membershipCreateSchema.parse(input);

  const result = await withVerifiedStudioContext(
    context.authUserId,
    context.studioId,
    async (tx) => {
      const [studio, member] = await Promise.all([
        tx.studio.findUniqueOrThrow({
          where: { id: context.studioId },
          select: { timezone: true },
        }),
        tx.member.findFirst({
          where: { id: memberId, studioId: context.studioId },
          select: { id: true },
        }),
      ]);

      if (!member) {
        throw new MemberNotFoundError(memberId);
      }

      const activePeriod = await tx.membershipPeriod.findFirst({
        where: {
          studioId: context.studioId,
          memberId,
          status: { in: ['ACTIVE', 'PAUSED'] },
        },
        select: { id: true, status: true },
      });
      if (activePeriod) {
        throw new MembershipConflictError(
          `Member already has a ${activePeriod.status.toLowerCase()} membership.`,
        );
      }

      const plan = await resolvePlan(
        tx,
        context.studioId,
        validated.planId,
        validated.planType,
      );

      const todayStr = getStudioLocalDate(studio.timezone);
      const startsAtStr = validated.startsAt || todayStr;
      const originalEndsAtStr = addCalendarDays(
        startsAtStr,
        plan.durationDays - 1,
      );
      const effectiveEndsAtStr = originalEndsAtStr;

      try {
        const created = await tx.membershipPeriod.create({
          data: {
            studioId: context.studioId,
            memberId,
            planId: plan.id,
            startsAt: calendarDateToUtcDate(startsAtStr),
            originalEndsAt: calendarDateToUtcDate(originalEndsAtStr),
            effectiveEndsAt: calendarDateToUtcDate(effectiveEndsAtStr),
            status: 'ACTIVE',
          },
          include: {
            plan: {
              select: { name: true, durationDays: true, priceCents: true },
            },
            pauses: {
              orderBy: { startsAt: 'desc' },
              select: {
                id: true,
                startsAt: true,
                resumesAt: true,
                createdAt: true,
              },
            },
          },
        });
        return mapPeriodDetail(created);
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          throw new MembershipConflictError(
            'Member already has an active or paused membership period.',
          );
        }
        throw error;
      }
    },
  );

  triggerMemberRetentionReassessment(context, memberId);
  return result;
}

export async function renewMembership(
  context: StudioContext,
  memberId: string,
  periodId: string,
  input: MembershipRenew = {},
): Promise<MembershipPeriodDetail> {
  const validated = membershipRenewSchema.parse(input);

  const result = await withVerifiedStudioContext(
    context.authUserId,
    context.studioId,
    async (tx) => {
      const studio = await tx.studio.findUniqueOrThrow({
        where: { id: context.studioId },
        select: { timezone: true },
      });

      const target = await tx.membershipPeriod.findFirst({
        where: { id: periodId, studioId: context.studioId, memberId },
        include: {
          plan: {
            select: { id: true, name: true, durationDays: true, priceCents: true },
          },
        },
      });
      if (!target) {
        throw new MembershipNotFoundError(periodId);
      }

      if (target.status === 'PAUSED') {
        throw new InvalidMembershipStateError(
          'Cannot renew a paused membership. Resume or unpause the membership first.',
        );
      }
      if (target.status === 'CANCELLED') {
        throw new InvalidMembershipStateError(
          'Cannot renew a cancelled membership. Create a new membership instead.',
        );
      }

      const plan = validated.planId || validated.planType
        ? await resolvePlan(tx, context.studioId, validated.planId, validated.planType)
        : target.plan;

      const todayStr = getStudioLocalDate(studio.timezone);
      const targetEffectiveEnds = dateToCalendarDate(target.effectiveEndsAt);

      let startsAtStr: string;
      if (target.status === 'ACTIVE' && targetEffectiveEnds >= todayStr) {
        startsAtStr = addCalendarDays(targetEffectiveEnds, 1);
      } else {
        startsAtStr = validated.startsAt || todayStr;
      }

      const originalEndsAtStr = addCalendarDays(
        startsAtStr,
        plan.durationDays - 1,
      );
      const effectiveEndsAtStr = originalEndsAtStr;

      // If previous period was ACTIVE, mark it EXPIRED to keep exact one ACTIVE record
      if (target.status === 'ACTIVE') {
        await tx.membershipPeriod.update({
          where: { id_studioId: { id: target.id, studioId: context.studioId } },
          data: { status: 'EXPIRED' },
        });
      }

      const created = await tx.membershipPeriod.create({
        data: {
          studioId: context.studioId,
          memberId,
          planId: plan.id,
          startsAt: calendarDateToUtcDate(startsAtStr),
          originalEndsAt: calendarDateToUtcDate(originalEndsAtStr),
          effectiveEndsAt: calendarDateToUtcDate(effectiveEndsAtStr),
          status: 'ACTIVE',
          renewedFromId: target.id,
        },
        include: {
          plan: {
            select: { name: true, durationDays: true, priceCents: true },
          },
          pauses: {
            orderBy: { startsAt: 'desc' },
            select: {
              id: true,
              startsAt: true,
              resumesAt: true,
              createdAt: true,
            },
          },
        },
      });

      return mapPeriodDetail(created);
    },
  );

  triggerMemberRetentionReassessment(context, memberId);
  return result;
}

export async function pauseMembership(
  context: StudioContext,
  memberId: string,
  periodId: string,
  input: MembershipPause = {},
): Promise<{
  period: { id: string; status: 'PAUSED'; effectiveEndsAt: string };
  pause: { id: string; startsAt: string; resumesAt: null };
}> {
  const validated = membershipPauseSchema.parse(input);

  const result = await withVerifiedStudioContext(
    context.authUserId,
    context.studioId,
    async (tx) => {
      const studio = await tx.studio.findUniqueOrThrow({
        where: { id: context.studioId },
        select: { timezone: true },
      });

      const period = await tx.membershipPeriod.findFirst({
        where: { id: periodId, studioId: context.studioId, memberId },
        select: { id: true, status: true, startsAt: true, effectiveEndsAt: true },
      });
      if (!period) {
        throw new MembershipNotFoundError(periodId);
      }
      if (period.status !== 'ACTIVE') {
        throw new InvalidMembershipStateError(
          'Only active memberships can be paused.',
        );
      }

      const openPause = await tx.membershipPause.findFirst({
        where: { studioId: context.studioId, periodId, resumesAt: null },
        select: { id: true },
      });
      if (openPause) {
        throw new MembershipConflictError(
          'Membership already has an active open pause.',
        );
      }

      const todayStr = getStudioLocalDate(studio.timezone);
      const startsAtStr = validated.startsAt || todayStr;

      const pause = await tx.membershipPause.create({
        data: {
          studioId: context.studioId,
          periodId,
          startsAt: calendarDateToUtcDate(startsAtStr),
          resumesAt: null,
        },
        select: { id: true, startsAt: true, resumesAt: true },
      });

      const updated = await tx.membershipPeriod.update({
        where: { id_studioId: { id: periodId, studioId: context.studioId } },
        data: { status: 'PAUSED' },
        select: { id: true, status: true, effectiveEndsAt: true },
      });

      return {
        period: {
          id: updated.id,
          status: 'PAUSED' as const,
          effectiveEndsAt: dateToCalendarDate(updated.effectiveEndsAt),
        },
        pause: {
          id: pause.id,
          startsAt: dateToCalendarDate(pause.startsAt),
          resumesAt: null,
        },
      };
    },
  );

  triggerMemberRetentionReassessment(context, memberId);
  return result;
}

export async function resumeMembership(
  context: StudioContext,
  memberId: string,
  periodId: string,
  input: MembershipResume = {},
): Promise<{
  period: { id: string; status: 'ACTIVE'; effectiveEndsAt: string };
  pause: { id: string; startsAt: string; resumesAt: string };
  extendedDays: number;
}> {
  const validated = membershipResumeSchema.parse(input);

  const result = await withVerifiedStudioContext(
    context.authUserId,
    context.studioId,
    async (tx) => {
      const studio = await tx.studio.findUniqueOrThrow({
        where: { id: context.studioId },
        select: { timezone: true },
      });

      const period = await tx.membershipPeriod.findFirst({
        where: { id: periodId, studioId: context.studioId, memberId },
        select: { id: true, status: true, effectiveEndsAt: true },
      });
      if (!period) {
        throw new MembershipNotFoundError(periodId);
      }
      if (period.status !== 'PAUSED') {
        throw new InvalidMembershipStateError(
          'Only paused memberships can be resumed.',
        );
      }

      const openPause = await tx.membershipPause.findFirst({
        where: { studioId: context.studioId, periodId, resumesAt: null },
        select: { id: true, startsAt: true },
      });
      if (!openPause) {
        throw new InvalidMembershipStateError(
          'No open pause record found for this membership.',
        );
      }

      const todayStr = getStudioLocalDate(studio.timezone);
      const resumesAtStr = validated.resumesAt || todayStr;
      const pauseStartsAtStr = dateToCalendarDate(openPause.startsAt);

      if (resumesAtStr < pauseStartsAtStr) {
        throw new InvalidMembershipStateError(
          'Resume date cannot be earlier than pause start date.',
        );
      }

      const pausedDays = calendarDaysBetween(pauseStartsAtStr, resumesAtStr);
      const currentEffectiveStr = dateToCalendarDate(period.effectiveEndsAt);
      const newEffectiveStr = addCalendarDays(currentEffectiveStr, pausedDays);

      const [updatedPause, updatedPeriod] = await Promise.all([
        tx.membershipPause.update({
          where: { id_studioId: { id: openPause.id, studioId: context.studioId } },
          data: { resumesAt: calendarDateToUtcDate(resumesAtStr) },
          select: { id: true, startsAt: true, resumesAt: true },
        }),
        tx.membershipPeriod.update({
          where: { id_studioId: { id: periodId, studioId: context.studioId } },
          data: {
            status: 'ACTIVE',
            effectiveEndsAt: calendarDateToUtcDate(newEffectiveStr),
          },
          select: { id: true, status: true, effectiveEndsAt: true },
        }),
      ]);

      return {
        period: {
          id: updatedPeriod.id,
          status: 'ACTIVE' as const,
          effectiveEndsAt: dateToCalendarDate(updatedPeriod.effectiveEndsAt),
        },
        pause: {
          id: updatedPause.id,
          startsAt: dateToCalendarDate(updatedPause.startsAt),
          resumesAt: dateToCalendarDate(updatedPause.resumesAt!),
        },
        extendedDays: pausedDays,
      };
    },
  );

  triggerMemberRetentionReassessment(context, memberId);
  return result;
}

export async function cancelMembership(
  context: StudioContext,
  memberId: string,
  periodId: string,
  input: MembershipCancel = {},
): Promise<MembershipPeriodDetail> {
  const validated = membershipCancelSchema.parse(input);

  const result = await withVerifiedStudioContext(
    context.authUserId,
    context.studioId,
    async (tx) => {
      const studio = await tx.studio.findUniqueOrThrow({
        where: { id: context.studioId },
        select: { timezone: true },
      });

      const period = await tx.membershipPeriod.findFirst({
        where: { id: periodId, studioId: context.studioId, memberId },
        include: {
          plan: { select: { name: true, durationDays: true, priceCents: true } },
          pauses: {
            orderBy: { startsAt: 'desc' },
            select: { id: true, startsAt: true, resumesAt: true, createdAt: true },
          },
        },
      });
      if (!period) {
        throw new MembershipNotFoundError(periodId);
      }
      if (period.status === 'CANCELLED') {
        throw new InvalidMembershipStateError(
          'Membership is already cancelled.',
        );
      }

      const todayStr = getStudioLocalDate(studio.timezone);
      const effectiveDateStr = validated.effectiveDate || todayStr;
      const originalEndsStr = dateToCalendarDate(period.originalEndsAt);
      const startsAtStr = dateToCalendarDate(period.startsAt);

      // In accordance with MembershipPeriod_lifecycle_check: effectiveEndsAt <= originalEndsAt
      let finalEffectiveStr = effectiveDateStr <= originalEndsStr ? effectiveDateStr : originalEndsStr;
      if (finalEffectiveStr < startsAtStr) {
        finalEffectiveStr = startsAtStr;
      }

      // Close open pause if one exists
      const openPause = await tx.membershipPause.findFirst({
        where: { studioId: context.studioId, periodId, resumesAt: null },
      });
      if (openPause) {
        await tx.membershipPause.update({
          where: { id_studioId: { id: openPause.id, studioId: context.studioId } },
          data: { resumesAt: calendarDateToUtcDate(finalEffectiveStr) },
        });
      }

      const updated = await tx.membershipPeriod.update({
        where: { id_studioId: { id: periodId, studioId: context.studioId } },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          effectiveEndsAt: calendarDateToUtcDate(finalEffectiveStr),
        },
        include: {
          plan: { select: { name: true, durationDays: true, priceCents: true } },
          pauses: {
            orderBy: { startsAt: 'desc' },
            select: { id: true, startsAt: true, resumesAt: true, createdAt: true },
          },
        },
      });

      return mapPeriodDetail(updated);
    },
  );

  triggerMemberRetentionReassessment(context, memberId);
  return result;
}

export async function getMembershipHistory(
  context: StudioContext,
  memberId: string,
): Promise<MembershipPeriodDetail[]> {
  return withVerifiedStudioContext(
    context.authUserId,
    context.studioId,
    async (tx) => {
      const member = await tx.member.findFirst({
        where: { id: memberId, studioId: context.studioId },
        select: { id: true },
      });
      if (!member) {
        throw new MemberNotFoundError(memberId);
      }

      const rows = await tx.membershipPeriod.findMany({
        where: { memberId, studioId: context.studioId },
        orderBy: [{ startsAt: 'desc' }, { createdAt: 'desc' }],
        include: {
          plan: {
            select: { name: true, durationDays: true, priceCents: true },
          },
          pauses: {
            orderBy: { startsAt: 'desc' },
            select: {
              id: true,
              startsAt: true,
              resumesAt: true,
              createdAt: true,
            },
          },
        },
      });

      return rows.map(mapPeriodDetail);
    },
  );
}
