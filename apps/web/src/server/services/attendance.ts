import 'server-only';

import { randomUUID } from 'node:crypto';
import { Prisma, withVerifiedStudioContext } from '@pranax/database';
import type {
  AttendanceCheckIn,
  AttendanceCheckInResponse,
  AttendanceImportRequest,
  AttendanceImportResponse,
  AttendanceListQuery,
  AttendanceListResponse,
  AttendanceWarningStatus,
  EngagementMetrics,
} from '@pranax/contracts';
import {
  attendanceCheckInSchema,
  attendanceImportRequestSchema,
} from '@pranax/contracts';
import type { StudioContext } from '../auth/context';
import {
  AttendanceError,
  MemberNotFoundError,
} from './errors';
import {
  addCalendarDays,
  calendarDateToUtcDate,
  calendarDaysBetween,
  dateToCalendarDate,
  getStudioLocalDate,
} from '../utils/dates';
import { triggerMemberRetentionReassessment } from './retentionTrigger';

export async function recordManualCheckIn(
  context: StudioContext,
  input: AttendanceCheckIn,
): Promise<AttendanceCheckInResponse['data']> {
  const validated = attendanceCheckInSchema.parse(input);

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
          where: { id: validated.memberId, studioId: context.studioId },
          select: { id: true, firstName: true, lastName: true },
        }),
      ]);

      if (!member) {
        throw new MemberNotFoundError(validated.memberId);
      }

      const occurredAt = validated.occurredAt
        ? new Date(validated.occurredAt)
        : new Date();
      if (Number.isNaN(occurredAt.getTime())) {
        throw new AttendanceError('Invalid attendance timestamp.', 400);
      }

      const localDateStr = getStudioLocalDate(studio.timezone, occurredAt);
      const localDate = calendarDateToUtcDate(localDateStr);

      // Determine membership warning status
      const activePeriod = await tx.membershipPeriod.findFirst({
        where: {
          studioId: context.studioId,
          memberId: validated.memberId,
          status: { in: ['ACTIVE', 'PAUSED'] },
        },
        select: { status: true },
      });

      let warning: { status: AttendanceWarningStatus; message: string } | null =
        null;
      if (!activePeriod) {
        const latestPeriod = await tx.membershipPeriod.findFirst({
          where: { studioId: context.studioId, memberId: validated.memberId },
          orderBy: [{ effectiveEndsAt: 'desc' }, { createdAt: 'desc' }],
          select: { status: true },
        });

        if (!latestPeriod) {
          warning = {
            status: 'NO_MEMBERSHIP',
            message: 'Member does not have any membership records.',
          };
        } else if (latestPeriod.status === 'EXPIRED') {
          warning = {
            status: 'EXPIRED',
            message: 'Member membership has expired.',
          };
        } else if (latestPeriod.status === 'CANCELLED') {
          warning = {
            status: 'CANCELLED',
            message: 'Member membership was cancelled.',
          };
        }
      } else if (activePeriod.status === 'PAUSED') {
        warning = {
          status: 'PAUSED',
          message: 'Member membership is currently paused.',
        };
      }

      // Check if already checked in today (idempotent handling)
      const existing = await tx.attendanceRecord.findFirst({
        where: {
          studioId: context.studioId,
          memberId: validated.memberId,
          localDate,
        },
        select: { id: true, occurredAt: true, localDate: true, source: true },
      });

      if (existing) {
        return {
          id: existing.id,
          memberId: validated.memberId,
          memberName: `${member.firstName} ${member.lastName}`,
          occurredAt: existing.occurredAt.toISOString(),
          localDate: dateToCalendarDate(existing.localDate),
          source: existing.source,
          alreadyCheckedIn: true,
          membershipWarning: warning,
        };
      }

      try {
        const created = await tx.attendanceRecord.create({
          data: {
            studioId: context.studioId,
            memberId: validated.memberId,
            occurredAt,
            localDate,
            source: 'MANUAL',
          },
          select: { id: true, occurredAt: true, localDate: true, source: true },
        });

        return {
          id: created.id,
          memberId: validated.memberId,
          memberName: `${member.firstName} ${member.lastName}`,
          occurredAt: created.occurredAt.toISOString(),
          localDate: dateToCalendarDate(created.localDate),
          source: created.source,
          alreadyCheckedIn: false,
          membershipWarning: warning,
        };
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          // Concurrent duplicate check-in occurred; re-fetch existing
          const rec = await tx.attendanceRecord.findFirst({
            where: {
              studioId: context.studioId,
              memberId: validated.memberId,
              localDate,
            },
            select: { id: true, occurredAt: true, localDate: true, source: true },
          });
          if (rec) {
            return {
              id: rec.id,
              memberId: validated.memberId,
              memberName: `${member.firstName} ${member.lastName}`,
              occurredAt: rec.occurredAt.toISOString(),
              localDate: dateToCalendarDate(rec.localDate),
              source: rec.source,
              alreadyCheckedIn: true,
              membershipWarning: warning,
            };
          }
        }
        throw error;
      }
    },
  );

  triggerMemberRetentionReassessment(context, validated.memberId);
  return result;
}

export async function listStudioAttendance(
  context: StudioContext,
  query: Partial<AttendanceListQuery> = {},
): Promise<AttendanceListResponse> {
  const limit = Math.min(Math.max(Number(query.limit) || 50, 1), 100);
  const offset = Math.max(Number(query.offset) || 0, 0);

  return withVerifiedStudioContext(
    context.authUserId,
    context.studioId,
    async (tx) => {
      const where: Prisma.AttendanceRecordWhereInput = {
        studioId: context.studioId,
      };

      if (query.memberId) {
        where.memberId = query.memberId;
      }
      if (query.source) {
        where.source = query.source;
      }
      if (query.startDate || query.endDate) {
        where.localDate = {};
        if (query.startDate) {
          where.localDate.gte = calendarDateToUtcDate(query.startDate);
        }
        if (query.endDate) {
          where.localDate.lte = calendarDateToUtcDate(query.endDate);
        }
      }

      const [total, records] = await Promise.all([
        tx.attendanceRecord.count({ where }),
        tx.attendanceRecord.findMany({
          where,
          orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
          skip: offset,
          take: limit,
          select: {
            id: true,
            memberId: true,
            occurredAt: true,
            localDate: true,
            source: true,
            member: {
              select: { firstName: true, lastName: true, email: true },
            },
          },
        }),
      ]);

      return {
        data: records.map((r) => ({
          id: r.id,
          memberId: r.memberId,
          memberName: `${r.member.firstName} ${r.member.lastName}`,
          memberEmail: r.member.email,
          occurredAt: r.occurredAt.toISOString(),
          localDate: dateToCalendarDate(r.localDate),
          source: r.source,
        })),
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + records.length < total,
        },
      };
    },
  );
}

export async function calculateMemberEngagementMetrics(
  tx: Prisma.TransactionClient,
  studioId: string,
  memberId: string,
  studioTimezone: string,
): Promise<EngagementMetrics> {
  const [settings, records] = await Promise.all([
    tx.studioSettings.findUnique({
      where: { studioId },
      select: { attendanceCoverageFrom: true, coverageVerifiedAt: true },
    }),
    tx.attendanceRecord.findMany({
      where: { studioId, memberId },
      orderBy: { localDate: 'asc' },
      select: { localDate: true },
    }),
  ]);

  const todayStr = getStudioLocalDate(studioTimezone);
  const distinctDates = Array.from(
    new Set(records.map((r) => dateToCalendarDate(r.localDate))),
  ).filter((d) => d <= todayStr);

  const totalAttendanceDays = distinctDates.length;
  const lastAttendanceDate =
    distinctDates.length > 0 ? distinctDates[distinctDates.length - 1] : null;
  const daysSinceLastVisit = lastAttendanceDate
    ? calendarDaysBetween(lastAttendanceDate, todayStr)
    : null;

  // Evaluate Coverage Status
  let coverageStatus: 'VERIFIED' | 'INCOMPLETE' | 'UNKNOWN' = 'UNKNOWN';
  let hasValidCoverage = false;

  if (settings?.attendanceCoverageFrom && settings.coverageVerifiedAt) {
    const coverageStartStr = dateToCalendarDate(settings.attendanceCoverageFrom);
    const coverageVerifiedStr = getStudioLocalDate(
      studioTimezone,
      settings.coverageVerifiedAt,
    );
    const sixtyDaysAgoStr = addCalendarDays(todayStr, -59);

    if (
      coverageStartStr <= sixtyDaysAgoStr &&
      coverageVerifiedStr >= todayStr
    ) {
      coverageStatus = 'VERIFIED';
      hasValidCoverage = true;
    } else {
      coverageStatus = 'INCOMPLETE';
      // Partial coverage allows recency if coverage reaches today
      hasValidCoverage = coverageVerifiedStr >= todayStr;
    }
  }

  // Attendance in last 7 days: [today - 6, today]
  const last7DaysStartStr = addCalendarDays(todayStr, -6);
  const attendanceLast7Days = hasValidCoverage
    ? distinctDates.filter((d) => d >= last7DaysStartStr && d <= todayStr).length
    : null;

  // Attendance in last 30 days: [today - 29, today]
  const last30DaysStartStr = addCalendarDays(todayStr, -29);
  const attendanceLast30Days = hasValidCoverage
    ? distinctDates.filter((d) => d >= last30DaysStartStr && d <= todayStr).length
    : null;

  const weeklyAverageFrequency =
    attendanceLast30Days !== null
      ? Math.round((attendanceLast30Days / (30 / 7)) * 10) / 10
      : null;

  // Consecutive 30-day change requires verified 60-day coverage
  let changeConsecutive30Days: EngagementMetrics['changeConsecutive30Days'] =
    null;
  if (coverageStatus === 'VERIFIED') {
    const prev30StartStr = addCalendarDays(todayStr, -59);
    const prev30EndStr = addCalendarDays(todayStr, -30);

    const recent = distinctDates.filter(
      (d) => d >= last30DaysStartStr && d <= todayStr,
    ).length;
    const previous = distinctDates.filter(
      (d) => d >= prev30StartStr && d <= prev30EndStr,
    ).length;

    const absoluteChange = recent - previous;
    const percentageDecline =
      previous === 0
        ? null
        : Math.max(
            0,
            Math.round(((previous - recent) / previous) * 100 * 100) / 100,
          );

    changeConsecutive30Days = {
      recent,
      previous,
      absoluteChange,
      percentageDecline,
    };
  }

  return {
    totalAttendanceDays,
    lastAttendanceDate,
    daysSinceLastVisit,
    attendanceLast7Days,
    attendanceLast30Days,
    weeklyAverageFrequency,
    changeConsecutive30Days,
    coverageStatus,
  };
}

export async function listMemberAttendance(
  context: StudioContext,
  memberId: string,
  query: Partial<AttendanceListQuery> = {},
): Promise<{
  data: AttendanceListResponse['data'];
  pagination: AttendanceListResponse['pagination'];
  metrics: EngagementMetrics;
}> {
  const limit = Math.min(Math.max(Number(query.limit) || 50, 1), 100);
  const offset = Math.max(Number(query.offset) || 0, 0);

  return withVerifiedStudioContext(
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
          select: { id: true, firstName: true, lastName: true, email: true },
        }),
      ]);

      if (!member) {
        throw new MemberNotFoundError(memberId);
      }

      const where: Prisma.AttendanceRecordWhereInput = {
        studioId: context.studioId,
        memberId,
      };

      if (query.source) {
        where.source = query.source;
      }
      if (query.startDate || query.endDate) {
        where.localDate = {};
        if (query.startDate) {
          where.localDate.gte = calendarDateToUtcDate(query.startDate);
        }
        if (query.endDate) {
          where.localDate.lte = calendarDateToUtcDate(query.endDate);
        }
      }

      const [total, records, metrics] = await Promise.all([
        tx.attendanceRecord.count({ where }),
        tx.attendanceRecord.findMany({
          where,
          orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
          skip: offset,
          take: limit,
          select: {
            id: true,
            memberId: true,
            occurredAt: true,
            localDate: true,
            source: true,
          },
        }),
        calculateMemberEngagementMetrics(
          tx,
          context.studioId,
          memberId,
          studio.timezone,
        ),
      ]);

      return {
        data: records.map((r) => ({
          id: r.id,
          memberId: r.memberId,
          memberName: `${member.firstName} ${member.lastName}`,
          memberEmail: member.email,
          occurredAt: r.occurredAt.toISOString(),
          localDate: dateToCalendarDate(r.localDate),
          source: r.source,
        })),
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + records.length < total,
        },
        metrics,
      };
    },
  );
}

function parseCsvLines(csvText: string): string[][] {
  const lines: string[][] = [];
  const rawLines = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  for (const rawLine of rawLines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;
    // Simple robust CSV tokenizer handling basic comma separation and quotes
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < rawLine.length; i++) {
      const char = rawLine[i];
      if (char === '"') {
        if (inQuotes && rawLine[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        cells.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    cells.push(current.trim());
    lines.push(cells);
  }
  return lines;
}

export async function importAttendanceCsv(
  context: StudioContext,
  input: AttendanceImportRequest,
): Promise<AttendanceImportResponse['data']> {
  const validated = attendanceImportRequestSchema.parse(input);

  // Safeguard: Limit file size to 5MB
  if (validated.csvContent.length > 5 * 1024 * 1024) {
    throw new AttendanceError(
      'CSV file exceeds maximum allowed size of 5MB.',
      413,
      'FILE_TOO_LARGE',
    );
  }

  const rawRows = parseCsvLines(validated.csvContent);
  if (rawRows.length < 2) {
    throw new AttendanceError(
      'CSV file must contain a header row and at least one data row.',
      400,
    );
  }

  // Row limit safeguard: Max 2000 rows per batch
  if (rawRows.length - 1 > 2000) {
    throw new AttendanceError(
      'CSV exceeds maximum limit of 2,000 data rows per batch.',
      400,
      'ROW_LIMIT_EXCEEDED',
    );
  }

  const headers = rawRows[0].map((h) => h.toLowerCase().replace(/[\s_-]/g, ''));
  const memberIdCol = headers.findIndex((h) =>
    ['memberid', 'id'].includes(h),
  );
  const emailCol = headers.findIndex((h) => ['email', 'memberemail'].includes(h));
  const phoneCol = headers.findIndex((h) => ['phone', 'memberphone'].includes(h));
  const timestampCol = headers.findIndex((h) =>
    [
      'attendancetimestamp',
      'occurredat',
      'checkedinat',
      'timestamp',
      'date',
      'datetime',
    ].includes(h),
  );

  if (timestampCol === -1) {
    throw new AttendanceError(
      'CSV header must include an attendance timestamp column.',
      400,
    );
  }
  if (memberIdCol === -1 && emailCol === -1 && phoneCol === -1) {
    throw new AttendanceError(
      'CSV header must include at least one member identifier column (member_id, email, or phone).',
      400,
    );
  }

  const idempotencyKey = validated.idempotencyKey || randomUUID();

  const result = await withVerifiedStudioContext(
    context.authUserId,
    context.studioId,
    async (tx) => {
      // Check existing batch for idempotent retry
      const existingBatch = await tx.attendanceImportBatch.findFirst({
        where: { studioId: context.studioId, idempotencyKey },
        select: { id: true, sourceName: true, rowCount: true },
      });
      if (existingBatch) {
        return {
          batchId: existingBatch.id,
          sourceName: existingBatch.sourceName,
          idempotencyKey,
          totalRows: rawRows.length - 1,
          importedRows: existingBatch.rowCount,
          duplicateRows: 0,
          rejectedRows: 0,
          errors: [],
          reassessedMemberIds: [],
        };
      }

      const [studio, allMembers] = await Promise.all([
        tx.studio.findUniqueOrThrow({
          where: { id: context.studioId },
          select: { timezone: true },
        }),
        tx.member.findMany({
          where: { studioId: context.studioId },
          select: { id: true, email: true, phone: true },
        }),
      ]);

      const membersById = new Map(allMembers.map((m) => [m.id, m]));
      const membersByEmail = new Map(
        allMembers
          .filter((m) => m.email)
          .map((m) => [m.email!.trim().toLowerCase(), m]),
      );
      const membersByPhone = new Map(
        allMembers
          .filter((m) => m.phone)
          .map((m) => [m.phone!.trim(), m]),
      );

      const errors: Array<{ row: number; identifier?: string; error: string }> =
        [];
      const validRecords: Array<{
        id: string;
        studioId: string;
        memberId: string;
        occurredAt: Date;
        localDate: Date;
        source: 'CSV';
      }> = [];

      const seenInBatch = new Set<string>();
      let duplicateRows = 0;

      for (let i = 1; i < rawRows.length; i++) {
        const row = rawRows[i];
        const rowNum = i + 1; // 1-based line number including header

        const rawMemberId = memberIdCol !== -1 ? row[memberIdCol]?.trim() : '';
        const rawEmail =
          emailCol !== -1 ? row[emailCol]?.trim().toLowerCase() : '';
        const rawPhone = phoneCol !== -1 ? row[phoneCol]?.trim() : '';
        const rawTimestamp = row[timestampCol]?.trim();

        const identifierStr = rawMemberId || rawEmail || rawPhone || undefined;

        if (!rawMemberId && !rawEmail && !rawPhone) {
          errors.push({
            row: rowNum,
            error: 'Row missing member identifier (member_id, email, or phone).',
          });
          continue;
        }

        // Identifier resolution & conflict verification
        const matchedMembers = new Set<string>();
        if (rawMemberId) {
          const match = membersById.get(rawMemberId);
          if (match) matchedMembers.add(match.id);
          else {
            errors.push({
              row: rowNum,
              identifier: rawMemberId,
              error: `Member ID "${rawMemberId}" not found in current studio.`,
            });
            continue;
          }
        }
        if (rawEmail) {
          const match = membersByEmail.get(rawEmail);
          if (match) matchedMembers.add(match.id);
          else {
            errors.push({
              row: rowNum,
              identifier: rawEmail,
              error: `Member email "${rawEmail}" not found in current studio.`,
            });
            continue;
          }
        }
        if (rawPhone) {
          const match = membersByPhone.get(rawPhone);
          if (match) matchedMembers.add(match.id);
          else {
            errors.push({
              row: rowNum,
              identifier: rawPhone,
              error: `Member phone "${rawPhone}" not found in current studio.`,
            });
            continue;
          }
        }

        if (matchedMembers.size === 0) {
          errors.push({
            row: rowNum,
            identifier: identifierStr,
            error: 'Member not found in current studio.',
          });
          continue;
        }
        if (matchedMembers.size > 1) {
          errors.push({
            row: rowNum,
            identifier: identifierStr,
            error: 'Conflicting member identifiers resolve to different members.',
          });
          continue;
        }

        const resolvedMemberId = Array.from(matchedMembers)[0];

        // Timestamp parsing
        const occurredAt = new Date(rawTimestamp);
        if (Number.isNaN(occurredAt.getTime())) {
          errors.push({
            row: rowNum,
            identifier: identifierStr,
            error: `Invalid timestamp: "${rawTimestamp}".`,
          });
          continue;
        }

        const localDateStr = getStudioLocalDate(studio.timezone, occurredAt);
        const localDate = calendarDateToUtcDate(localDateStr);
        const batchKey = `${resolvedMemberId}_${localDateStr}`;

        if (seenInBatch.has(batchKey)) {
          duplicateRows++;
          continue;
        }
        seenInBatch.add(batchKey);

        validRecords.push({
          id: randomUUID(),
          studioId: context.studioId,
          memberId: resolvedMemberId,
          occurredAt,
          localDate,
          source: 'CSV',
        });
      }

      // Check existing database records to filter out persistent duplicates
      const uniqueCandidatePairs = validRecords.map((r) => ({
        memberId: r.memberId,
        localDate: r.localDate,
      }));

      const existingRecords = await tx.attendanceRecord.findMany({
        where: {
          studioId: context.studioId,
          OR: uniqueCandidatePairs.map((p) => ({
            memberId: p.memberId,
            localDate: p.localDate,
          })),
        },
        select: { memberId: true, localDate: true },
      });

      const existingSet = new Set(
        existingRecords.map(
          (e) => `${e.memberId}_${dateToCalendarDate(e.localDate)}`,
        ),
      );

      const toInsert = validRecords.filter((r) => {
        const key = `${r.memberId}_${dateToCalendarDate(r.localDate)}`;
        if (existingSet.has(key)) {
          duplicateRows++;
          return false;
        }
        return true;
      });

      // Partial import: Create batch and commit valid records even if other rows had errors
      const batch = await tx.attendanceImportBatch.create({
        data: {
          studioId: context.studioId,
          sourceName: validated.sourceName,
          idempotencyKey,
          rowCount: toInsert.length,
        },
        select: { id: true, sourceName: true },
      });

      if (toInsert.length > 0) {
        await tx.attendanceRecord.createMany({
          data: toInsert.map((rec) => ({
            ...rec,
            batchId: batch.id,
          })),
          skipDuplicates: true,
        });
      }

      const totalDataRows = rawRows.length - 1;
      const reassessedMemberIds = Array.from(
        new Set(toInsert.map((r) => r.memberId)),
      );

      return {
        batchId: batch.id,
        sourceName: batch.sourceName,
        idempotencyKey,
        totalRows: totalDataRows,
        importedRows: toInsert.length,
        duplicateRows,
        rejectedRows: errors.length,
        errors,
        reassessedMemberIds,
      };
    },
  );

  // Trigger non-blocking reassessment for members affected by the batch
  for (const mId of result.reassessedMemberIds) {
    triggerMemberRetentionReassessment(context, mId);
  }

  return {
    batchId: result.batchId,
    sourceName: result.sourceName,
    idempotencyKey: result.idempotencyKey,
    totalRows: result.totalRows,
    importedRows: result.importedRows,
    duplicateRows: result.duplicateRows,
    rejectedRows: result.rejectedRows,
    errors: result.errors,
  };
}

export async function getImportBatchById(
  context: StudioContext,
  batchId: string,
): Promise<{
  id: string;
  sourceName: string;
  idempotencyKey: string;
  importedAt: string;
  rowCount: number;
} | null> {
  return withVerifiedStudioContext(
    context.authUserId,
    context.studioId,
    async (tx) => {
      const batch = await tx.attendanceImportBatch.findFirst({
        where: { id: batchId, studioId: context.studioId },
        select: {
          id: true,
          sourceName: true,
          idempotencyKey: true,
          importedAt: true,
          rowCount: true,
        },
      });
      if (!batch) return null;
      return {
        id: batch.id,
        sourceName: batch.sourceName,
        idempotencyKey: batch.idempotencyKey,
        importedAt: batch.importedAt.toISOString(),
        rowCount: batch.rowCount,
      };
    },
  );
}
