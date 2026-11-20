import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RetentionAssessmentOutput } from '@pranax/contracts';

type SnapshotRow = {
  id: string;
  studioId: string;
  memberId: string;
  snapshotDate: Date;
  snapshotType: 'DAILY' | 'SIGNIFICANT_EVENT';
  score: number;
  category: string;
  dimensionScores: unknown;
  indicators: unknown;
  recommendation: string | null;
  isComplete: boolean;
  scoringVersion: string;
  assessmentMetadata: unknown;
  assessmentFingerprint: string;
};

let rows: SnapshotRow[];
let nextId: number;
let persistAssessment: (typeof import('./retention.js'))['persistRetentionAssessment'];

function matches(row: SnapshotRow, where: Record<string, unknown>): boolean {
  return Object.entries(where).every(([key, value]) => {
    if (key === 'snapshotDate' && value instanceof Date) {
      return row.snapshotDate.getTime() === value.getTime();
    }
    if (
      key === 'snapshotDate' &&
      value &&
      typeof value === 'object' &&
      'lte' in value
    ) {
      return row.snapshotDate.getTime() <= (value.lte as Date).getTime();
    }
    return row[key as keyof SnapshotRow] === value;
  });
}

function createTestTransaction() {
  return {
    retentionSnapshot: {
      findFirst: async ({ where }: { where: Record<string, unknown> }) =>
        rows.find((row) => matches(row, where)) ?? null,
      createMany: async ({
        data,
      }: {
        data: Array<Omit<SnapshotRow, 'id'>>;
      }) => {
        const inserted = data.filter((candidate) => {
          const duplicateDaily =
            candidate.snapshotType === 'DAILY' &&
            rows.some(
              (row) =>
                row.snapshotType === 'DAILY' &&
                row.studioId === candidate.studioId &&
                row.memberId === candidate.memberId &&
                row.snapshotDate.getTime() === candidate.snapshotDate.getTime(),
            );
          const duplicateFingerprint = rows.some(
            (row) =>
              row.studioId === candidate.studioId &&
              row.memberId === candidate.memberId &&
              row.snapshotDate.getTime() === candidate.snapshotDate.getTime() &&
              row.scoringVersion === candidate.scoringVersion &&
              row.assessmentFingerprint === candidate.assessmentFingerprint,
          );
          return !duplicateDaily && !duplicateFingerprint;
        });
        for (const row of inserted) {
          rows.push({ ...row, id: `snapshot-${++nextId}` });
        }
        return { count: inserted.length };
      },
    },
  };
}

const context = {
  authUserId: '00000000-0000-4000-8000-000000000001',
  studioId: '00000000-0000-4000-8000-000000000002',
};

function assessment(
  overrides: Partial<RetentionAssessmentOutput> = {},
): RetentionAssessmentOutput {
  return {
    studio_id: context.studioId,
    member_id: '00000000-0000-4000-8000-000000000003',
    assessment_date: '2026-11-20',
    assessed_at: '2026-11-20T08:00:00.000Z',
    scoring_version: 'retention-v1.0.0',
    status: 'COMPLETE',
    is_complete: true,
    lifecycle_state: 'ACTIVE',
    lifecycle_events: [],
    score: 40,
    category: 'MEDIUM',
    dimensions: {},
    indicators: [],
    recommendation: {
      action: 'CONTACT_MEMBER',
      priority: 'MEDIUM',
      title: 'Check in with the member',
      explanation: 'Attendance has declined.',
      trigger: 'ATTENDANCE_DECLINE',
      evidence: [],
    },
    completeness_reasons: [],
    ...overrides,
  };
}

function persist(input: RetentionAssessmentOutput) {
  return persistAssessment(context, input);
}

describe('retention snapshot persistence', () => {
  beforeEach(async () => {
    rows = [];
    nextId = 0;
    vi.resetModules();
    vi.doUnmock('server-only');
    vi.doUnmock('@pranax/database');
    vi.doMock('server-only', () => ({}));
    vi.doMock('@pranax/database', () => ({
      withVerifiedStudioContext: async (
        _authUserId: string,
        _studioId: string,
        operation: (tx: unknown) => Promise<unknown>,
      ) => operation(createTestTransaction()),
    }));
    const service = await import('./retention.js');
    persistAssessment = service.persistRetentionAssessment;
  });

  it('creates the first complete assessment as a daily snapshot', async () => {
    const result = await persist(assessment());

    expect(result.outcome).toBe('PERSISTED');
    expect(rows).toHaveLength(1);
    expect(rows[0].snapshotType).toBe('DAILY');
  });

  it('deduplicates identical results when assessment timestamps differ', async () => {
    const first = await persist(assessment());
    const repeated = await persist(
      assessment({ assessed_at: '2026-11-20T08:01:00.000Z' }),
    );

    expect(first.outcome).toBe('PERSISTED');
    expect(repeated).toEqual({
      outcome: 'EQUIVALENT_EXISTS',
      snapshot_id: first.snapshot_id,
    });
    expect(rows).toHaveLength(1);
  });

  it('creates a new daily snapshot on the next studio-local assessment date', async () => {
    await persist(assessment());
    const nextDay = await persist(
      assessment({
        assessment_date: '2026-11-21',
        assessed_at: '2026-11-21T08:00:00.000Z',
      }),
    );

    expect(nextDay.outcome).toBe('PERSISTED');
    expect(rows).toHaveLength(2);
    expect(rows.every((row) => row.snapshotType === 'DAILY')).toBe(true);
  });

  it('stores a significant same-day change as an event snapshot', async () => {
    await persist(assessment());
    const changed = await persist(assessment({ score: 50, category: 'HIGH' }));

    expect(changed.outcome).toBe('PERSISTED');
    expect(rows).toHaveLength(2);
    expect(rows[1].snapshotType).toBe('SIGNIFICANT_EVENT');
  });

  it('does not store a same-day change below the provisional threshold', async () => {
    await persist(assessment());
    const changed = await persist(assessment({ score: 45 }));

    expect(changed.outcome).toBe('NO_SIGNIFICANT_CHANGE');
    expect(rows).toHaveLength(1);
  });

  it('deduplicates repeated significant event snapshots', async () => {
    await persist(assessment());
    const changed = assessment({ score: 50, category: 'HIGH' });
    const first = await persist(changed);
    const repeated = await persist({
      ...changed,
      assessed_at: '2026-11-20T08:30:00.000Z',
    });

    expect(first.outcome).toBe('PERSISTED');
    expect(repeated.outcome).toBe('EQUIVALENT_EXISTS');
    expect(rows).toHaveLength(2);
  });

  it('does not persist limited assessments with no fabricated score', async () => {
    const result = await persist(
      assessment({
        status: 'LIMITED',
        is_complete: false,
        score: null,
        category: null,
      }),
    );

    expect(result).toEqual({ outcome: 'NOT_ELIGIBLE', snapshot_id: null });
    expect(rows).toHaveLength(0);
  });

  it('deduplicates concurrent identical assessment requests', async () => {
    const results = await Promise.all([
      persist(assessment()),
      persist(assessment()),
    ]);

    expect(results.map((result) => result.outcome).sort()).toEqual([
      'EQUIVALENT_EXISTS',
      'PERSISTED',
    ]);
    expect(rows).toHaveLength(1);
  });
});
