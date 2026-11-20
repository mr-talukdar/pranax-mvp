import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { StudioContext } from '../auth/context';

const context: StudioContext = {
  authUserId: '00000000-0000-4000-8000-000000000001',
  studioId: '00000000-0000-4000-8000-000000000002',
};

describe('dashboard service', () => {
  let mockDbData: {
    studio: { id: string; name: string; timezone: string } | null;
    totalMembers: number;
    newRegistrations: number;
    attendanceToday: number;
    membershipPeriods: Array<{
      id: string;
      memberId: string;
      status: 'ACTIVE' | 'PAUSED' | 'EXPIRED' | 'CANCELLED';
      startsAt: Date;
      effectiveEndsAt: Date;
      cancelledAt: Date | null;
      pauses: Array<{ startsAt: Date; resumesAt: Date | null }>;
    }>;
    attendanceRecords: Array<{
      localDate: Date;
      memberId: string;
    }>;
    snapshots: Array<{
      id: string;
      memberId: string;
      snapshotDate: Date;
      createdAt: Date;
      score: number;
      category: string;
      isComplete: boolean;
      recommendation: string | null;
      indicators: unknown;
      member: {
        id: string;
        firstName: string;
        lastName: string;
        joinedAt: Date;
        membershipPeriods: Array<{ plan: { name: string } }>;
        attendanceRecords: Array<{ localDate: Date }>;
      };
    }>;
    churnPredictionsCount: number;
    highRiskChurnCount: number;
  };

  function createTestTx() {
    return {
      studio: {
        findUnique: async () => mockDbData.studio,
      },
      member: {
        count: async ({ where }: { where: Record<string, unknown> }) => {
          if (where.joinedAt) {
            return mockDbData.newRegistrations;
          }
          return mockDbData.totalMembers;
        },
      },
      attendanceRecord: {
        count: async () => mockDbData.attendanceToday,
        findMany: async () => mockDbData.attendanceRecords,
      },
      membershipPeriod: {
        findMany: async () => mockDbData.membershipPeriods,
      },
      retentionSnapshot: {
        findMany: async () => mockDbData.snapshots,
      },
      churnPrediction: {
        count: async ({ where }: { where: Record<string, unknown> }) => {
          if (where.probability) {
            return mockDbData.highRiskChurnCount;
          }
          return mockDbData.churnPredictionsCount;
        },
      },
    };
  }

  beforeEach(() => {
    mockDbData = {
      studio: {
        id: context.studioId,
        name: 'Prana Pilates Test Studio',
        timezone: 'UTC',
      },
      totalMembers: 100,
      newRegistrations: 12,
      attendanceToday: 25,
      membershipPeriods: [],
      attendanceRecords: [],
      snapshots: [],
      churnPredictionsCount: 0,
      highRiskChurnCount: 0,
    };

    vi.resetModules();
    vi.doUnmock('server-only');
    vi.doUnmock('@pranax/database');
    vi.doMock('server-only', () => ({}));
    vi.doMock('@pranax/database', () => ({
      withVerifiedStudioContext: async (
        _authUserId: string,
        _studioId: string,
        operation: (tx: unknown) => Promise<unknown>,
      ) => operation(createTestTx()),
    }));
  });

  it('aggregates studio overview metrics with active, expiring, and paused members', async () => {
    const { getDashboardSummary } = await import('./dashboard.js');
    const asOfDate = '2026-06-25';

    mockDbData.membershipPeriods = [
      // 1. Genuinely active member, expiring in 3 days
      {
        id: 'p1',
        memberId: 'mem-1',
        status: 'ACTIVE',
        startsAt: new Date('2026-06-01T00:00:00.000Z'),
        effectiveEndsAt: new Date('2026-06-28T00:00:00.000Z'),
        cancelledAt: null,
        pauses: [],
      },
      // 2. Active member with long period (not expiring soon)
      {
        id: 'p2',
        memberId: 'mem-2',
        status: 'ACTIVE',
        startsAt: new Date('2026-06-01T00:00:00.000Z'),
        effectiveEndsAt: new Date('2026-07-30T00:00:00.000Z'),
        cancelledAt: null,
        pauses: [],
      },
      // 3. Member with ACTIVE period but has an active pause -> counted as PAUSED
      {
        id: 'p3',
        memberId: 'mem-3',
        status: 'ACTIVE',
        startsAt: new Date('2026-06-01T00:00:00.000Z'),
        effectiveEndsAt: new Date('2026-07-30T00:00:00.000Z'),
        cancelledAt: null,
        pauses: [
          {
            startsAt: new Date('2026-06-20T00:00:00.000Z'),
            resumesAt: new Date('2026-07-10T00:00:00.000Z'),
          },
        ],
      },
      // 4. Member with status PAUSED
      {
        id: 'p4',
        memberId: 'mem-4',
        status: 'PAUSED',
        startsAt: new Date('2026-05-01T00:00:00.000Z'),
        effectiveEndsAt: new Date('2026-08-01T00:00:00.000Z'),
        cancelledAt: null,
        pauses: [],
      },
      // 5. Expired member
      {
        id: 'p5',
        memberId: 'mem-5',
        status: 'EXPIRED',
        startsAt: new Date('2026-05-01T00:00:00.000Z'),
        effectiveEndsAt: new Date('2026-06-15T00:00:00.000Z'),
        cancelledAt: null,
        pauses: [],
      },
    ];

    const result = await getDashboardSummary(context, { asOfDate });

    expect(result.totalMembers).toBe(100);
    expect(result.activeMembers).toBe(2); // mem-1 and mem-2
    expect(result.expiringIn7Days).toBe(1); // mem-1
    expect(result.attendanceToday).toBe(25);
    expect(result.newRegistrations).toBe(12);

    expect(result.membershipBreakdown).toEqual({
      active: 2,
      activePercent: 40,
      paused: 2, // mem-3 and mem-4
      pausedPercent: 40,
      expiring: 1, // mem-1
      expiringPercent: 20,
      expired: 1, // mem-5
      expiredPercent: 20,
    });
  });

  it('generates zero-filled attendance trends for the specified window', async () => {
    const { getDashboardSummary } = await import('./dashboard.js');
    const asOfDate = '2026-06-25';

    mockDbData.attendanceRecords = [
      { localDate: new Date('2026-06-24T00:00:00.000Z'), memberId: 'mem-1' },
      { localDate: new Date('2026-06-24T00:00:00.000Z'), memberId: 'mem-2' },
      { localDate: new Date('2026-06-25T00:00:00.000Z'), memberId: 'mem-3' },
    ];

    const result = await getDashboardSummary(context, { asOfDate, trendDays: 5 });

    expect(result.attendanceTrends).toHaveLength(5);
    expect(result.attendanceTrends[0].date).toBe('2026-06-21');
    expect(result.attendanceTrends[0].count).toBe(0);

    const jun24 = result.attendanceTrends.find((t) => t.date === '2026-06-24');
    expect(jun24?.count).toBe(2);
    expect(jun24?.label).toBe('Jun 24');

    const todayTrend = result.attendanceTrends[result.attendanceTrends.length - 1];
    expect(todayTrend.date).toBe('2026-06-25');
    expect(todayTrend.label).toBe('Today (25)');
    expect(todayTrend.count).toBe(1);
  });

  it('deduplicates to the latest retention assessment per member and populates attention queue', async () => {
    const { getDashboardSummary } = await import('./dashboard.js');
    const asOfDate = '2026-06-25';

    mockDbData.snapshots = [
      // Older snapshot for mem-1: was MEDIUM
      {
        id: 's1-old',
        memberId: '11111111-1111-4000-8000-000000000001',
        snapshotDate: new Date('2026-06-20T00:00:00.000Z'),
        createdAt: new Date('2026-06-20T10:00:00.000Z'),
        score: 45,
        category: 'MEDIUM',
        isComplete: true,
        recommendation: 'Old recommendation',
        indicators: [],
        member: {
          id: '11111111-1111-4000-8000-000000000001',
          firstName: 'Alice',
          lastName: 'Smith',
          joinedAt: new Date('2026-01-01T00:00:00.000Z'),
          membershipPeriods: [{ plan: { name: 'Reformer Monthly' } }],
          attendanceRecords: [
            { localDate: new Date('2026-06-10T00:00:00.000Z') },
          ],
        },
      },
      // Latest snapshot for mem-1: now HIGH
      {
        id: 's1-new',
        memberId: '11111111-1111-4000-8000-000000000001',
        snapshotDate: new Date('2026-06-24T00:00:00.000Z'),
        createdAt: new Date('2026-06-24T10:00:00.000Z'),
        score: 85,
        category: 'HIGH',
        isComplete: true,
        recommendation: 'Urgent check-in needed',
        indicators: [
          { code: 'attendance_trend', explanation: 'Drop of -90% in 3 weeks' },
        ],
        member: {
          id: '11111111-1111-4000-8000-000000000001',
          firstName: 'Alice',
          lastName: 'Smith',
          joinedAt: new Date('2026-01-01T00:00:00.000Z'),
          membershipPeriods: [{ plan: { name: 'Reformer Monthly' } }],
          attendanceRecords: [
            { localDate: new Date('2026-06-10T00:00:00.000Z') },
          ],
        },
      },
      // Mem-2: LOW risk
      {
        id: 's2',
        memberId: '11111111-1111-4000-8000-000000000002',
        snapshotDate: new Date('2026-06-24T00:00:00.000Z'),
        createdAt: new Date('2026-06-24T10:00:00.000Z'),
        score: 15,
        category: 'LOW',
        isComplete: true,
        recommendation: 'Maintain cadence',
        indicators: [],
        member: {
          id: '11111111-1111-4000-8000-000000000002',
          firstName: 'Bob',
          lastName: 'Jones',
          joinedAt: new Date('2026-02-01T00:00:00.000Z'),
          membershipPeriods: [{ plan: { name: 'All Access' } }],
          attendanceRecords: [
            { localDate: new Date('2026-06-24T00:00:00.000Z') },
          ],
        },
      },
      // Mem-3: LIMITED assessment
      {
        id: 's3',
        memberId: '11111111-1111-4000-8000-000000000003',
        snapshotDate: new Date('2026-06-24T00:00:00.000Z'),
        createdAt: new Date('2026-06-24T10:00:00.000Z'),
        score: 0,
        category: 'LIMITED',
        isComplete: false,
        recommendation: 'Awaiting full attendance history',
        indicators: [],
        member: {
          id: '11111111-1111-4000-8000-000000000003',
          firstName: 'Charlie',
          lastName: 'Brown',
          joinedAt: new Date('2026-06-20T00:00:00.000Z'),
          membershipPeriods: [{ plan: { name: 'Trial Pass' } }],
          attendanceRecords: [],
        },
      },
    ];

    const result = await getDashboardSummary(context, { asOfDate });

    // Latest snapshots: mem-1 (HIGH), mem-2 (LOW), mem-3 (LIMITED) -> total 3 assessed
    expect(result.retentionSummary).toEqual({
      lowCount: 1,
      lowPercent: 33,
      mediumCount: 0,
      mediumPercent: 0,
      highCount: 1,
      highPercent: 33,
      limitedCount: 1,
      limitedPercent: 33,
    });
    expect(result.highRiskCount).toBe(1);

    // Attention queue should include mem-1 (HIGH) first, followed by mem-3 (LIMITED)
    expect(result.attentionQueue).toHaveLength(2);
    expect(result.attentionQueue[0]).toMatchObject({
      memberId: '11111111-1111-4000-8000-000000000001',
      memberName: 'Alice Smith',
      memberInitials: 'AS',
      planName: 'Reformer Monthly',
      score: 85,
      category: 'HIGH',
      daysAbsent: 15,
      cadenceDrop: 'Drop of -90% in 3 weeks',
      primaryRecommendation: 'Urgent check-in needed',
    });
  });

  it('handles empty studio data safely without division by zero', async () => {
    const { getDashboardSummary } = await import('./dashboard.js');
    mockDbData.totalMembers = 0;
    mockDbData.newRegistrations = 0;
    mockDbData.attendanceToday = 0;
    mockDbData.membershipPeriods = [];
    mockDbData.attendanceRecords = [];
    mockDbData.snapshots = [];

    const result = await getDashboardSummary(context, { asOfDate: '2026-06-25' });

    expect(result.activeMembers).toBe(0);
    expect(result.totalMembers).toBe(0);
    expect(result.newRegistrations).toBe(0);
    expect(result.attendanceToday).toBe(0);
    expect(result.highRiskCount).toBe(0);
    expect(result.membershipBreakdown).toEqual({
      active: 0,
      activePercent: 0,
      paused: 0,
      pausedPercent: 0,
      expiring: 0,
      expiringPercent: 0,
      expired: 0,
      expiredPercent: 0,
    });
    expect(result.retentionSummary).toEqual({
      lowCount: 0,
      lowPercent: 0,
      mediumCount: 0,
      mediumPercent: 0,
      highCount: 0,
      highPercent: 0,
      limitedCount: 0,
      limitedPercent: 0,
    });
    expect(result.attentionQueue).toEqual([]);
    expect(result.mlInsights).toEqual({
      enabled: false,
      modelStatus: 'DISABLED',
      highRiskChurnCount: 0,
    });
  });
});
