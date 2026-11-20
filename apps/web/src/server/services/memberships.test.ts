import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
import { Prisma } from '@pranax/database';
import {
  cancelMembership,
  createMembership,
  getMembershipHistory,
  pauseMembership,
  renewMembership,
  resumeMembership,
} from './memberships';
import {
  MembershipConflictError,
} from './errors';

type MockPeriod = {
  id: string;
  studioId: string;
  memberId: string;
  planId: string;
  startsAt: Date;
  originalEndsAt: Date;
  effectiveEndsAt: Date;
  status: 'ACTIVE' | 'PAUSED' | 'EXPIRED' | 'CANCELLED';
  renewedFromId: string | null;
  cancelledAt: Date | null;
  createdAt: Date;
  plan: { id: string; name: string; durationDays: number; priceCents: number };
  pauses: Array<{
    id: string;
    studioId: string;
    periodId: string;
    startsAt: Date;
    resumesAt: Date | null;
    createdAt: Date;
  }>;
};

type MockPlan = {
  id: string;
  studioId: string;
  name: string;
  durationDays: number;
  priceCents: number;
};

let periods: MockPeriod[];
let plans: MockPlan[];
let pauses: MockPeriod['pauses'];
let nextId: number;

function mockTx() {
  return {
    studio: {
      findUniqueOrThrow: async () => ({ timezone: 'Asia/Kolkata' }),
    },
    member: {
      findFirst: async ({ where }: { where: { id: string; studioId: string } }) => {
        if (where.id.startsWith('valid-member')) {
          return { id: where.id, studioId: where.studioId };
        }
        return null;
      },
    },
    membershipPlan: {
      findFirst: async ({ where }: { where: Record<string, unknown> }) => {
        return (
          plans.find(
            (p) =>
              p.studioId === where.studioId &&
              (p.id === where.id || p.name === where.name),
          ) ?? null
        );
      },
      create: async ({ data }: { data: Prisma.MembershipPlanCreateInput }) => {
        const id = `plan-${++nextId}`;
        const newPlan: MockPlan = {
          id,
          studioId: data.studio?.connect?.id || (data as unknown as { studioId: string }).studioId,
          name: data.name,
          durationDays: data.durationDays,
          priceCents: data.priceCents,
        };
        plans.push(newPlan);
        return newPlan;
      },
    },
    membershipPeriod: {
      findFirst: async ({
        where,
        include,
      }: {
        where: Record<string, unknown>;
        include?: { plan?: boolean; pauses?: boolean };
      }) => {
        const found = periods.find((p) => {
          if (where.studioId && p.studioId !== where.studioId) return false;
          if (where.memberId && p.memberId !== where.memberId) return false;
          if (where.id && p.id !== where.id) return false;
          if (where.status) {
            if (typeof where.status === 'string' && p.status !== where.status) return false;
            if (
              typeof where.status === 'object' &&
              'in' in where.status &&
              Array.isArray(where.status.in)
            ) {
              if (!where.status.in.includes(p.status)) return false;
            }
          }
          return true;
        });
        if (!found) return null;
        return {
          ...found,
          plan: found.plan,
          pauses: include?.pauses ? found.pauses : [],
        };
      },
      findMany: async ({ where }: { where: Record<string, unknown> }) => {
        return periods
          .filter(
            (p) =>
              p.studioId === where.studioId && p.memberId === where.memberId,
          )
          .map((p) => ({ ...p, pauses: p.pauses }));
      },
      create: async ({
        data,
      }: {
        data: Prisma.MembershipPeriodUncheckedCreateInput;
      }) => {
        // Enforce DB constraint: one active/paused per member
        if (['ACTIVE', 'PAUSED'].includes(data.status)) {
          const conflict = periods.find(
            (p) =>
              p.studioId === data.studioId &&
              p.memberId === data.memberId &&
              ['ACTIVE', 'PAUSED'].includes(p.status),
          );
          if (conflict) {
            throw new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
              code: 'P2002',
              clientVersion: 'test',
            });
          }
        }

        const id = `period-${++nextId}`;
        const plan = plans.find((pl) => pl.id === data.planId)!;
        const newPeriod: MockPeriod = {
          id,
          studioId: data.studioId,
          memberId: data.memberId,
          planId: data.planId,
          startsAt: data.startsAt as Date,
          originalEndsAt: data.originalEndsAt as Date,
          effectiveEndsAt: data.effectiveEndsAt as Date,
          status: data.status as 'ACTIVE' | 'PAUSED' | 'EXPIRED' | 'CANCELLED',
          renewedFromId: (data.renewedFromId as string) || null,
          cancelledAt: null,
          createdAt: new Date(),
          plan,
          pauses: [],
        };
        periods.push(newPeriod);
        return newPeriod;
      },
      update: async ({
        where,
        data,
      }: {
        where: { id_studioId: { id: string; studioId: string } };
        data: Prisma.MembershipPeriodUpdateInput;
      }) => {
        const period = periods.find(
          (p) =>
            p.id === where.id_studioId.id &&
            p.studioId === where.id_studioId.studioId,
        );
        if (!period) throw new Error('Not found');
        if (data.status) period.status = data.status as MockPeriod['status'];
        if (data.effectiveEndsAt) {
          period.effectiveEndsAt = data.effectiveEndsAt as Date;
        }
        if (data.cancelledAt) period.cancelledAt = data.cancelledAt as Date;
        return period;
      },
    },
    membershipPause: {
      findFirst: async ({ where }: { where: Record<string, unknown> }) => {
        return (
          pauses.find((pause) => {
            if (where.studioId && pause.studioId !== where.studioId) return false;
            if (where.periodId && pause.periodId !== where.periodId) return false;
            if (where.resumesAt === null && pause.resumesAt !== null) return false;
            return true;
          }) ?? null
        );
      },
      create: async ({
        data,
      }: {
        data: Prisma.MembershipPauseUncheckedCreateInput;
      }) => {
        const id = `pause-${++nextId}`;
        const newPause = {
          id,
          studioId: data.studioId,
          periodId: data.periodId,
          startsAt: data.startsAt as Date,
          resumesAt: null,
          createdAt: new Date(),
        };
        pauses.push(newPause);
        const period = periods.find((p) => p.id === data.periodId);
        if (period) period.pauses.push(newPause);
        return newPause;
      },
      update: async ({
        where,
        data,
      }: {
        where: { id_studioId: { id: string; studioId: string } };
        data: Prisma.MembershipPauseUpdateInput;
      }) => {
        const pause = pauses.find(
          (p) =>
            p.id === where.id_studioId.id &&
            p.studioId === where.id_studioId.studioId,
        );
        if (!pause) throw new Error('Pause not found');
        if (data.resumesAt) pause.resumesAt = data.resumesAt as Date;
        return pause;
      },
    },
  };
}

vi.mock('@pranax/database', () => ({
  Prisma: {
    PrismaClientKnownRequestError: class extends Error {
      code: string;
      constructor(msg: string, meta: { code: string }) {
        super(msg);
        this.code = meta.code;
      }
    },
  },
  withVerifiedStudioContext: async (
    _authUserId: string,
    _studioId: string,
    operation: (tx: unknown) => Promise<unknown>,
  ) => {
    return operation(mockTx());
  },
}));

const context = {
  authUserId: 'user-1',
  studioId: '00000000-0000-4000-8000-000000000001',
};

describe('F01: Membership Lifecycle Service', () => {
  beforeEach(() => {
    periods = [];
    plans = [];
    pauses = [];
    nextId = 0;
  });

  it('creates an active membership with 30-day duration starting today', async () => {
    const period = await createMembership(context, 'valid-member-1', {
      planType: 'MONTHLY',
      startsAt: '2026-06-01',
    });

    expect(period.id).toBeDefined();
    expect(period.status).toBe('ACTIVE');
    expect(period.startsAt).toBe('2026-06-01');
    expect(period.originalEndsAt).toBe('2026-06-30'); // June 1 + 29 days = June 30 (30 days total)
    expect(period.effectiveEndsAt).toBe('2026-06-30');
    expect(period.planName).toBe('Monthly');
  });

  it('creates quarterly (90 days) and annual (365 days) plans accurately', async () => {
    const quarterly = await createMembership(context, 'valid-member-2', {
      planType: 'QUARTERLY',
      startsAt: '2026-01-01',
    });
    expect(quarterly.startsAt).toBe('2026-01-01');
    expect(quarterly.originalEndsAt).toBe('2026-03-31'); // 31 + 28 + 31 = 90 days

    const annual = await createMembership(context, 'valid-member-3', {
      planType: 'ANNUAL',
      startsAt: '2026-01-01',
    });
    expect(annual.originalEndsAt).toBe('2026-12-31'); // 365 days
  });

  it('prevents concurrent active memberships for the same member', async () => {
    await createMembership(context, 'valid-member-1', {
      planType: 'MONTHLY',
      startsAt: '2026-06-01',
    });

    await expect(
      createMembership(context, 'valid-member-1', {
        planType: 'MONTHLY',
        startsAt: '2026-07-01',
      }),
    ).rejects.toThrow(MembershipConflictError);
  });

  it('renews membership preserving historical periods intact and linking renewedFromId', async () => {
    const firstPeriod = await createMembership(context, 'valid-member-1', {
      planType: 'MONTHLY',
      startsAt: '2026-06-01',
    });

    const renewed = await renewMembership(
      context,
      'valid-member-1',
      firstPeriod.id,
      { planType: 'MONTHLY' },
    );

    expect(renewed.renewedFromId).toBe(firstPeriod.id);
    expect(renewed.status).toBe('ACTIVE');

    // First period status must become EXPIRED with dates preserved
    const history = await getMembershipHistory(context, 'valid-member-1');
    expect(history).toHaveLength(2);
    const old = history.find((p) => p.id === firstPeriod.id)!;
    expect(old.status).toBe('EXPIRED');
    expect(old.originalEndsAt).toBe('2026-06-30');
    expect(old.effectiveEndsAt).toBe('2026-06-30');
  });

  it('pauses and resumes membership, extending effective expiry by exact paused duration', async () => {
    const period = await createMembership(context, 'valid-member-1', {
      planType: 'MONTHLY',
      startsAt: '2026-06-01',
    });

    expect(period.effectiveEndsAt).toBe('2026-06-30');

    // Pause on June 10
    const pauseResult = await pauseMembership(
      context,
      'valid-member-1',
      period.id,
      { startsAt: '2026-06-10' },
    );
    expect(pauseResult.period.status).toBe('PAUSED');

    // Resume on June 20 (10 days paused)
    const resumeResult = await resumeMembership(
      context,
      'valid-member-1',
      period.id,
      { resumesAt: '2026-06-20' },
    );

    expect(resumeResult.period.status).toBe('ACTIVE');
    expect(resumeResult.extendedDays).toBe(10);
    // Original ends June 30 + 10 days = July 10
    expect(resumeResult.period.effectiveEndsAt).toBe('2026-07-10');
  });

  it('accumulates multiple pause intervals correctly', async () => {
    const period = await createMembership(context, 'valid-member-1', {
      planType: 'MONTHLY',
      startsAt: '2026-06-01',
    });

    // Pause 1: June 10 to June 15 (5 days)
    await pauseMembership(context, 'valid-member-1', period.id, {
      startsAt: '2026-06-10',
    });
    const r1 = await resumeMembership(context, 'valid-member-1', period.id, {
      resumesAt: '2026-06-15',
    });
    expect(r1.period.effectiveEndsAt).toBe('2026-07-05'); // 30 + 5 = July 5

    // Pause 2: June 25 to June 29 (4 days)
    await pauseMembership(context, 'valid-member-1', period.id, {
      startsAt: '2026-06-25',
    });
    const r2 = await resumeMembership(context, 'valid-member-1', period.id, {
      resumesAt: '2026-06-29',
    });
    // July 5 + 4 days = July 9
    expect(r2.period.effectiveEndsAt).toBe('2026-07-09');
  });

  it('cancels membership respecting effective date and preserving history', async () => {
    const period = await createMembership(context, 'valid-member-1', {
      planType: 'MONTHLY',
      startsAt: '2026-06-01',
    });

    const cancelled = await cancelMembership(
      context,
      'valid-member-1',
      period.id,
      { effectiveDate: '2026-06-15' },
    );

    expect(cancelled.status).toBe('CANCELLED');
    expect(cancelled.cancelledAt).toBeDefined();
    expect(cancelled.effectiveEndsAt).toBe('2026-06-15');
    expect(cancelled.originalEndsAt).toBe('2026-06-30');
  });
});
