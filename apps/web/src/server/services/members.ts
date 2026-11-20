import 'server-only';

import { Prisma, withVerifiedStudioContext } from '@pranax/database';
import type {
  MemberCreate,
  MemberListQuery,
  MemberListResponse,
  MemberSummary,
  MemberUpdate,
} from '@pranax/contracts';
import {
  memberCreateSchema,
  memberUpdateSchema,
} from '@pranax/contracts';
import type { StudioContext } from '../auth/context';
import {
  DuplicateMemberEmailError,
  MemberNotFoundError,
} from './errors';
import { dateToCalendarDate } from '../utils/dates';

function normalizeEmail(email?: string | null): string | null {
  if (!email) return null;
  const trimmed = email.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizePhone(phone?: string | null): string | null {
  if (!phone) return null;
  const trimmed = phone.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export type MemberDetailRecord = MemberSummary & {
  currentMembership: {
    id: string;
    planId: string;
    planName: string;
    durationDays: number;
    priceCents: number;
    startsAt: string;
    originalEndsAt: string;
    effectiveEndsAt: string;
    status: 'ACTIVE' | 'PAUSED' | 'EXPIRED' | 'CANCELLED';
    renewedFromId: string | null;
    cancelledAt: string | null;
    pauses: Array<{
      id: string;
      startsAt: string;
      resumesAt: string | null;
      durationDays: number | null;
      createdAt: string;
    }>;
  } | null;
};

export async function listMembers(
  context: StudioContext,
  query: Partial<MemberListQuery> = {},
): Promise<MemberListResponse> {
  const limit = Math.min(Math.max(Number(query.limit) || 50, 1), 100);
  const offset = Math.max(Number(query.offset) || 0, 0);
  const search = query.search?.trim();
  const status = query.status;
  const sort = query.sort || 'name_asc';

  return withVerifiedStudioContext(
    context.authUserId,
    context.studioId,
    async (tx) => {
      const where: Prisma.MemberWhereInput = {
        studioId: context.studioId,
      };

      if (search) {
        where.OR = [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (status) {
        if (status === 'ACTIVE') {
          where.membershipPeriods = { some: { status: 'ACTIVE' } };
        } else if (status === 'PAUSED') {
          where.membershipPeriods = { some: { status: 'PAUSED' } };
        } else if (status === 'EXPIRED') {
          where.membershipPeriods = {
            some: { status: 'EXPIRED' },
            none: { status: { in: ['ACTIVE', 'PAUSED'] } },
          };
        } else if (status === 'CANCELLED') {
          where.membershipPeriods = {
            some: { status: 'CANCELLED' },
            none: { status: { in: ['ACTIVE', 'PAUSED'] } },
          };
        } else if (status === 'NO_MEMBERSHIP') {
          where.membershipPeriods = { none: {} };
        }
      }

      let orderBy: Prisma.MemberOrderByWithRelationInput[];
      if (sort === 'name_desc') {
        orderBy = [{ lastName: 'desc' }, { firstName: 'desc' }, { id: 'asc' }];
      } else if (sort === 'joined_desc') {
        orderBy = [{ joinedAt: 'desc' }, { id: 'asc' }];
      } else {
        orderBy = [{ lastName: 'asc' }, { firstName: 'asc' }, { id: 'asc' }];
      }

      const [total, rows] = await Promise.all([
        tx.member.count({ where }),
        tx.member.findMany({
          where,
          orderBy,
          skip: offset,
          take: limit,
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            joinedAt: true,
            createdAt: true,
            updatedAt: true,
            retentionSnapshots: {
              where: { studioId: context.studioId },
              orderBy: [{ snapshotDate: 'desc' }, { createdAt: 'desc' }],
              take: 1,
              select: {
                category: true,
                score: true,
                isComplete: true,
              },
            },
            membershipPeriods: {
              where: { studioId: context.studioId },
              orderBy: [{ effectiveEndsAt: 'desc' }, { createdAt: 'desc' }],
              take: 1,
              select: {
                id: true,
                planId: true,
                status: true,
                startsAt: true,
                effectiveEndsAt: true,
                plan: {
                  select: { name: true },
                },
              },
            },
          },
        }),
      ]);

      const data: MemberSummary[] = rows.map((row) => {
        const current = row.membershipPeriods[0];
        const latestRetention = row.retentionSnapshots[0];
        const rawCategory = latestRetention?.category.toUpperCase();
        const retentionCategory: MemberSummary['retentionCategory'] =
          !latestRetention
            ? null
            : !latestRetention.isComplete || rawCategory === 'LIMITED'
              ? 'LIMITED'
              : rawCategory === 'LOW' || rawCategory === 'MEDIUM' || rawCategory === 'HIGH'
                ? rawCategory
                : null;
        return {
          id: row.id,
          firstName: row.firstName,
          lastName: row.lastName,
          email: row.email,
          phone: row.phone,
          joinedAt: row.joinedAt.toISOString(),
          createdAt: row.createdAt.toISOString(),
          updatedAt: row.updatedAt.toISOString(),
          retentionCategory,
          retentionScore: latestRetention?.score ?? null,
          currentMembership: current
            ? {
                id: current.id,
                planId: current.planId,
                planName: current.plan.name,
                status: current.status,
                startsAt: dateToCalendarDate(current.startsAt),
                effectiveEndsAt: dateToCalendarDate(current.effectiveEndsAt),
              }
            : null,
        };
      });

      return {
        data,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + rows.length < total,
        },
      };
    },
  );
}

export async function createMember(
  context: StudioContext,
  input: MemberCreate,
): Promise<MemberSummary> {
  const validated = memberCreateSchema.parse(input);
  const email = normalizeEmail(validated.email);
  const phone = normalizePhone(validated.phone);

  return withVerifiedStudioContext(
    context.authUserId,
    context.studioId,
    async (tx) => {
      if (email) {
        const existing = await tx.member.findFirst({
          where: { studioId: context.studioId, email },
          select: { id: true },
        });
        if (existing) {
          throw new DuplicateMemberEmailError(email);
        }
      }

      try {
        const created = await tx.member.create({
          data: {
            studioId: context.studioId,
            firstName: validated.firstName.trim(),
            lastName: validated.lastName.trim(),
            email,
            phone,
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            joinedAt: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        return {
          ...created,
          joinedAt: created.joinedAt.toISOString(),
          createdAt: created.createdAt.toISOString(),
          updatedAt: created.updatedAt.toISOString(),
          currentMembership: null,
        };
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          throw new DuplicateMemberEmailError(email || 'unknown');
        }
        throw error;
      }
    },
  );
}

export async function getMemberById(
  context: StudioContext,
  memberId: string,
): Promise<MemberDetailRecord | null> {
  return withVerifiedStudioContext(
    context.authUserId,
    context.studioId,
    async (tx) => {
      const row = await tx.member.findFirst({
        where: { id: memberId, studioId: context.studioId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          joinedAt: true,
          createdAt: true,
          updatedAt: true,
          membershipPeriods: {
            where: { studioId: context.studioId },
            orderBy: [{ effectiveEndsAt: 'desc' }, { createdAt: 'desc' }],
            take: 1,
            select: {
              id: true,
              planId: true,
              status: true,
              startsAt: true,
              originalEndsAt: true,
              effectiveEndsAt: true,
              renewedFromId: true,
              cancelledAt: true,
              plan: {
                select: {
                  name: true,
                  durationDays: true,
                  priceCents: true,
                },
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
          },
        },
      });

      if (!row) return null;

      const current = row.membershipPeriods[0];
      return {
        id: row.id,
        firstName: row.firstName,
        lastName: row.lastName,
        email: row.email,
        phone: row.phone,
        joinedAt: row.joinedAt.toISOString(),
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        currentMembership: current
          ? {
              id: current.id,
              planId: current.planId,
              planName: current.plan.name,
              durationDays: current.plan.durationDays,
              priceCents: current.plan.priceCents,
              status: current.status,
              startsAt: dateToCalendarDate(current.startsAt),
              originalEndsAt: dateToCalendarDate(current.originalEndsAt),
              effectiveEndsAt: dateToCalendarDate(current.effectiveEndsAt),
              renewedFromId: current.renewedFromId,
              cancelledAt: current.cancelledAt?.toISOString() ?? null,
              pauses: current.pauses.map((p) => ({
                id: p.id,
                startsAt: dateToCalendarDate(p.startsAt),
                resumesAt: p.resumesAt ? dateToCalendarDate(p.resumesAt) : null,
                durationDays: p.resumesAt
                  ? Math.round(
                      (p.resumesAt.getTime() - p.startsAt.getTime()) /
                        (24 * 60 * 60 * 1000),
                    )
                  : null,
                createdAt: p.createdAt.toISOString(),
              })),
            }
          : null,
      };
    },
  );
}

export async function updateMember(
  context: StudioContext,
  memberId: string,
  input: MemberUpdate,
): Promise<MemberSummary> {
  const validated = memberUpdateSchema.parse(input);

  return withVerifiedStudioContext(
    context.authUserId,
    context.studioId,
    async (tx) => {
      const existing = await tx.member.findFirst({
        where: { id: memberId, studioId: context.studioId },
        select: { id: true, email: true },
      });
      if (!existing) {
        throw new MemberNotFoundError(memberId);
      }

      const updateData: Prisma.MemberUpdateInput = {};

      if (validated.firstName !== undefined) {
        updateData.firstName = validated.firstName.trim();
      }
      if (validated.lastName !== undefined) {
        updateData.lastName = validated.lastName.trim();
      }
      if (validated.email !== undefined) {
        const nextEmail = normalizeEmail(validated.email);
        if (nextEmail && nextEmail !== existing.email) {
          const duplicate = await tx.member.findFirst({
            where: {
              studioId: context.studioId,
              email: nextEmail,
              id: { not: memberId },
            },
            select: { id: true },
          });
          if (duplicate) {
            throw new DuplicateMemberEmailError(nextEmail);
          }
        }
        updateData.email = nextEmail;
      }
      if (validated.phone !== undefined) {
        updateData.phone = normalizePhone(validated.phone);
      }

      try {
        const updated = await tx.member.update({
          where: { id_studioId: { id: memberId, studioId: context.studioId } },
          data: updateData,
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            joinedAt: true,
            createdAt: true,
            updatedAt: true,
            membershipPeriods: {
              where: { studioId: context.studioId },
              orderBy: [{ effectiveEndsAt: 'desc' }, { createdAt: 'desc' }],
              take: 1,
              select: {
                id: true,
                planId: true,
                status: true,
                startsAt: true,
                effectiveEndsAt: true,
                plan: { select: { name: true } },
              },
            },
          },
        });

        const current = updated.membershipPeriods[0];
        return {
          id: updated.id,
          firstName: updated.firstName,
          lastName: updated.lastName,
          email: updated.email,
          phone: updated.phone,
          joinedAt: updated.joinedAt.toISOString(),
          createdAt: updated.createdAt.toISOString(),
          updatedAt: updated.updatedAt.toISOString(),
          currentMembership: current
            ? {
                id: current.id,
                planId: current.planId,
                planName: current.plan.name,
                status: current.status,
                startsAt: dateToCalendarDate(current.startsAt),
                effectiveEndsAt: dateToCalendarDate(current.effectiveEndsAt),
              }
            : null,
        };
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          throw new DuplicateMemberEmailError(validated.email || 'unknown');
        }
        throw error;
      }
    },
  );
}
