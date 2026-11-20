import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import type { Prisma } from '@pranax/database';
import {
  calculateMemberEngagementMetrics,
  importAttendanceCsv,
  listMemberAttendance,
  listStudioAttendance,
  recordManualCheckIn,
} from './attendance';
import { MemberNotFoundError } from './errors';
import { calendarDateToUtcDate, dateToCalendarDate } from '../utils/dates';

type MockAttendance = {
  id: string;
  studioId: string;
  memberId: string;
  batchId: string | null;
  occurredAt: Date;
  localDate: Date;
  source: 'MANUAL' | 'CSV';
};

type MockBatch = {
  id: string;
  studioId: string;
  sourceName: string;
  idempotencyKey: string;
  rowCount: number;
  importedAt: Date;
};

type MockMember = {
  id: string;
  studioId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
};

type MockSettings = {
  studioId: string;
  attendanceCoverageFrom: Date | null;
  coverageVerifiedAt: Date | null;
};

let records: MockAttendance[];
let batches: MockBatch[];
let members: MockMember[];
let settings: MockSettings | null;
let membershipStatus: 'ACTIVE' | 'PAUSED' | 'EXPIRED' | 'CANCELLED' | null;
let nextId: number;

function mockTx() {
  return {
    studio: {
      findUniqueOrThrow: async () => ({ timezone: 'Asia/Kolkata' }),
    },
    studioSettings: {
      findUnique: async ({ where }: { where: { studioId: string } }) => {
        if (settings && settings.studioId === where.studioId) return settings;
        return null;
      },
    },
    member: {
      findFirst: async ({ where }: { where: Record<string, unknown> }) => {
        return (
          members.find((m) => {
            if (where.studioId && m.studioId !== where.studioId) return false;
            if (where.id && m.id !== where.id) return false;
            return true;
          }) ?? null
        );
      },
      findMany: async ({ where }: { where: Record<string, unknown> }) => {
        return members.filter((m) => m.studioId === where.studioId);
      },
    },
    membershipPeriod: {
      findFirst: async ({ where }: { where: Record<string, unknown> }) => {
        if (!membershipStatus) return null;
        if (where.status && typeof where.status === 'object' && 'in' in where.status) {
          const list = (where.status as { in: string[] }).in;
          if (!list.includes(membershipStatus)) return null;
        }
        return {
          id: 'mock-period-1',
          status: membershipStatus,
          effectiveEndsAt: new Date('2026-06-30T00:00:00.000Z'),
        };
      },
    },
    attendanceRecord: {
      count: async ({ where }: { where: Record<string, unknown> }) => {
        return records.filter((r) => {
          if (r.studioId !== where.studioId) return false;
          if (where.memberId && r.memberId !== where.memberId) return false;
          return true;
        }).length;
      },
      findMany: async ({
        where,
        skip = 0,
        take = 50,
      }: {
        where: Record<string, unknown>;
        skip?: number;
        take?: number;
      }) => {
        if (where.OR && Array.isArray(where.OR)) {
          const pairs = where.OR as Array<{ memberId: string; localDate: Date }>;
          return records.filter((r) =>
            pairs.some(
              (p) =>
                p.memberId === r.memberId &&
                dateToCalendarDate(p.localDate) === dateToCalendarDate(r.localDate),
            ),
          );
        }

        return records
          .filter((r) => {
            if (r.studioId !== where.studioId) return false;
            if (where.memberId && r.memberId !== where.memberId) return false;
            if (where.source && r.source !== where.source) return false;
            return true;
          })
          .slice(skip, skip + take)
          .map((r) => {
            const mem = members.find((m) => m.id === r.memberId)!;
            return {
              ...r,
              member: {
                firstName: mem?.firstName ?? 'Test',
                lastName: mem?.lastName ?? 'User',
                email: mem?.email ?? null,
              },
            };
          });
      },
      findFirst: async ({ where }: { where: Record<string, unknown> }) => {
        return (
          records.find((r) => {
            if (where.studioId && r.studioId !== where.studioId) return false;
            if (where.memberId && r.memberId !== where.memberId) return false;
            if (
              where.localDate &&
              dateToCalendarDate(r.localDate) !==
                dateToCalendarDate(where.localDate as Date)
            ) {
              return false;
            }
            return true;
          }) ?? null
        );
      },
      create: async ({
        data,
      }: {
        data: Prisma.AttendanceRecordUncheckedCreateInput;
      }) => {
        const id = `att-${++nextId}`;
        const newRecord: MockAttendance = {
          id,
          studioId: data.studioId,
          memberId: data.memberId,
          batchId: data.batchId ?? null,
          occurredAt: data.occurredAt as Date,
          localDate: data.localDate as Date,
          source: data.source as 'MANUAL' | 'CSV',
        };
        records.push(newRecord);
        return newRecord;
      },
      createMany: async ({
        data,
      }: {
        data: Prisma.AttendanceRecordUncheckedCreateInput[];
      }) => {
        let count = 0;
        for (const item of data) {
          const exists = records.some(
            (r) =>
              r.studioId === item.studioId &&
              r.memberId === item.memberId &&
              dateToCalendarDate(r.localDate) ===
                dateToCalendarDate(item.localDate as Date),
          );
          if (!exists) {
            records.push({
              id: `att-${++nextId}`,
              studioId: item.studioId,
              memberId: item.memberId,
              batchId: item.batchId ?? null,
              occurredAt: item.occurredAt as Date,
              localDate: item.localDate as Date,
              source: item.source as 'MANUAL' | 'CSV',
            });
            count++;
          }
        }
        return { count };
      },
    },
    attendanceImportBatch: {
      findFirst: async ({ where }: { where: Record<string, unknown> }) => {
        return (
          batches.find(
            (b) =>
              b.studioId === where.studioId &&
              (b.id === where.id || b.idempotencyKey === where.idempotencyKey),
          ) ?? null
        );
      },
      create: async ({
        data,
      }: {
        data: Prisma.AttendanceImportBatchUncheckedCreateInput;
      }) => {
        const id = `batch-${++nextId}`;
        const newBatch: MockBatch = {
          id,
          studioId: data.studioId,
          sourceName: data.sourceName,
          idempotencyKey: data.idempotencyKey,
          rowCount: data.rowCount ?? 0,
          importedAt: new Date(),
        };
        batches.push(newBatch);
        return newBatch;
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

const contextA = {
  authUserId: 'user-a',
  studioId: '00000000-0000-4000-8000-000000000001',
};

const contextB = {
  authUserId: 'user-b',
  studioId: '00000000-0000-4000-8000-000000000002',
};

describe('F02: Attendance Tracking & Engagement Metrics Service', () => {
  beforeEach(() => {
    records = [];
    batches = [];
    nextId = 0;
    membershipStatus = 'ACTIVE';
    settings = {
      studioId: contextA.studioId,
      attendanceCoverageFrom: calendarDateToUtcDate('2026-01-01'),
      coverageVerifiedAt: new Date('2026-12-31T00:00:00.000Z'),
    };
    members = [
      {
        id: '00000000-0000-4000-8000-000000000010',
        studioId: contextA.studioId,
        firstName: 'Sarah',
        lastName: 'Jenkins',
        email: 'sarah@example.com',
        phone: '+91 98301 22341',
      },
      {
        id: '00000000-0000-4000-8000-000000000020',
        studioId: contextA.studioId,
        firstName: 'David',
        lastName: 'Miller',
        email: 'david@example.com',
        phone: '+91 98302 99482',
      },
      {
        id: '00000000-0000-4000-8000-000000000099',
        studioId: contextB.studioId,
        firstName: 'Foreign',
        lastName: 'Member',
        email: 'foreign@example.com',
        phone: '+91 98309 00000',
      },
    ];
  });

  describe('4.1 Manual check-in', () => {
    it('records attendance with studio-local date and source MANUAL', async () => {
      const checkIn = await recordManualCheckIn(contextA, {
        memberId: '00000000-0000-4000-8000-000000000010',
        occurredAt: '2026-06-25T09:30:00.000Z',
      });

      expect(checkIn.id).toBeDefined();
      expect(checkIn.memberId).toBe('00000000-0000-4000-8000-000000000010');
      expect(checkIn.source).toBe('MANUAL');
      expect(checkIn.alreadyCheckedIn).toBe(false);
      expect(checkIn.localDate).toBe('2026-06-25');
      expect(checkIn.membershipWarning).toBeNull();
    });

    it('handles duplicate check-in idempotently on the same local date', async () => {
      const first = await recordManualCheckIn(contextA, {
        memberId: '00000000-0000-4000-8000-000000000010',
        occurredAt: '2026-06-25T09:30:00.000Z',
      });

      const second = await recordManualCheckIn(contextA, {
        memberId: '00000000-0000-4000-8000-000000000010',
        occurredAt: '2026-06-25T17:00:00.000Z',
      });

      expect(second.id).toBe(first.id);
      expect(second.alreadyCheckedIn).toBe(true);
      expect(records).toHaveLength(1);
    });

    it('returns warning when member has expired membership without blocking attendance', async () => {
      membershipStatus = 'EXPIRED';

      const checkIn = await recordManualCheckIn(contextA, {
        memberId: '00000000-0000-4000-8000-000000000010',
        occurredAt: '2026-06-25T09:30:00.000Z',
      });

      expect(checkIn.id).toBeDefined();
      expect(checkIn.membershipWarning).not.toBeNull();
      expect(checkIn.membershipWarning?.status).toBe('EXPIRED');
      expect(records).toHaveLength(1);
    });

    it('rejects check-in for a member of another studio', async () => {
      await expect(
        recordManualCheckIn(contextA, {
          memberId: '00000000-0000-4000-8000-000000000099', // Studio B member
        }),
      ).rejects.toThrow(MemberNotFoundError);
    });
  });

  describe('4.2 Attendance history', () => {
    it('lists studio-wide and member-specific attendance history', async () => {
      await recordManualCheckIn(contextA, {
        memberId: '00000000-0000-4000-8000-000000000010',
        occurredAt: '2026-06-25T09:30:00.000Z',
      });
      await recordManualCheckIn(contextA, {
        memberId: '00000000-0000-4000-8000-000000000020',
        occurredAt: '2026-06-25T10:00:00.000Z',
      });

      const studioList = await listStudioAttendance(contextA);
      expect(studioList.data).toHaveLength(2);

      const memberList = await listMemberAttendance(
        contextA,
        '00000000-0000-4000-8000-000000000010',
      );
      expect(memberList.data).toHaveLength(1);
      expect(memberList.data[0].memberId).toBe(
        '00000000-0000-4000-8000-000000000010',
      );
    });
  });

  describe('5. Engagement Metrics', () => {
    it('calculates metrics with verified coverage', async () => {
      const memberId = '00000000-0000-4000-8000-000000000010';
      // Seed some visits
      records.push({
        id: 'att-1',
        studioId: contextA.studioId,
        memberId,
        batchId: null,
        occurredAt: new Date('2026-06-01T09:30:00Z'),
        localDate: calendarDateToUtcDate('2026-06-01'),
        source: 'MANUAL',
      });
      records.push({
        id: 'att-2',
        studioId: contextA.studioId,
        memberId,
        batchId: null,
        occurredAt: new Date('2026-06-15T09:30:00Z'),
        localDate: calendarDateToUtcDate('2026-06-15'),
        source: 'MANUAL',
      });

      const metrics = await calculateMemberEngagementMetrics(
        mockTx() as unknown as Prisma.TransactionClient,
        contextA.studioId,
        memberId,
        'Asia/Kolkata',
      );

      expect(metrics.totalAttendanceDays).toBe(2);
      expect(metrics.lastAttendanceDate).toBe('2026-06-15');
      expect(metrics.coverageStatus).toBe('VERIFIED');
    });

    it('reports unknown coverage metrics when coverage is missing', async () => {
      settings = null; // No coverage settings

      const metrics = await calculateMemberEngagementMetrics(
        mockTx() as unknown as Prisma.TransactionClient,
        contextA.studioId,
        '00000000-0000-4000-8000-000000000010',
        'Asia/Kolkata',
      );

      expect(metrics.coverageStatus).toBe('UNKNOWN');
      expect(metrics.attendanceLast7Days).toBeNull();
      expect(metrics.attendanceLast30Days).toBeNull();
      expect(metrics.changeConsecutive30Days).toBeNull();
    });
  });

  describe('4.3 CSV attendance import', () => {
    it('imports valid CSV rows and maps identifiers accurately', async () => {
      const csv = `email,attendance_timestamp
sarah@example.com,2026-06-20T09:00:00Z
david@example.com,2026-06-20T10:00:00Z`;

      const result = await importAttendanceCsv(contextA, {
        csvContent: csv,
        sourceName: 'test.csv',
      });

      expect(result.totalRows).toBe(2);
      expect(result.importedRows).toBe(2);
      expect(result.rejectedRows).toBe(0);
      expect(result.duplicateRows).toBe(0);
      expect(records).toHaveLength(2);
    });

    it('performs partial import: imports valid rows while logging row-level errors for invalid rows', async () => {
      const csv = `email,attendance_timestamp
sarah@example.com,2026-06-20T09:00:00Z
unknown.member@example.com,2026-06-20T10:00:00Z
david@example.com,invalid-timestamp`;

      const result = await importAttendanceCsv(contextA, {
        csvContent: csv,
        sourceName: 'partial.csv',
      });

      expect(result.totalRows).toBe(3);
      expect(result.importedRows).toBe(1); // Only Sarah
      expect(result.rejectedRows).toBe(2);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0].identifier).toBe('unknown.member@example.com');
      expect(result.errors[1].identifier).toBe('david@example.com');
      expect(records).toHaveLength(1);
    });

    it('rejects conflicting identifiers for the same row', async () => {
      // Sarah's email with David's phone
      const csv = `email,phone,attendance_timestamp
sarah@example.com,+91 98302 99482,2026-06-20T09:00:00Z`;

      const result = await importAttendanceCsv(contextA, {
        csvContent: csv,
      });

      expect(result.importedRows).toBe(0);
      expect(result.rejectedRows).toBe(1);
      expect(result.errors[0].error).toContain('Conflicting member identifiers');
    });

    it('deduplicates duplicate rows within CSV and against database', async () => {
      const csv = `email,attendance_timestamp
sarah@example.com,2026-06-20T09:00:00Z
sarah@example.com,2026-06-20T15:00:00Z`; // Same member, same day

      const result = await importAttendanceCsv(contextA, {
        csvContent: csv,
      });

      expect(result.importedRows).toBe(1);
      expect(result.duplicateRows).toBe(1);
      expect(records).toHaveLength(1);
    });

    it('handles idempotent reimport with the same idempotency key', async () => {
      const csv = `email,attendance_timestamp
sarah@example.com,2026-06-20T09:00:00Z`;

      const first = await importAttendanceCsv(contextA, {
        csvContent: csv,
        idempotencyKey: 'batch-key-1',
      });

      const second = await importAttendanceCsv(contextA, {
        csvContent: csv,
        idempotencyKey: 'batch-key-1',
      });

      expect(second.batchId).toBe(first.batchId);
      expect(records).toHaveLength(1);
    });

    it('rejects members from another studio during import (cross-tenant safety)', async () => {
      const csv = `email,attendance_timestamp
foreign@example.com,2026-06-20T09:00:00Z`;

      const result = await importAttendanceCsv(contextA, {
        csvContent: csv,
      });

      expect(result.importedRows).toBe(0);
      expect(result.rejectedRows).toBe(1);
      expect(result.errors[0].error).toContain('not found in current studio');
    });
  });
});
