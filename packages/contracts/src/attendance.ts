import { z } from 'zod';
import { calendarDateSchema } from './memberships.js';

export const attendanceSourceEnum = z.enum(['MANUAL', 'CSV']);
export type AttendanceSource = z.infer<typeof attendanceSourceEnum>;

export const attendanceCheckInSchema = z.object({
  memberId: z.string().uuid('Valid member ID is required'),
  occurredAt: z.string().datetime({ offset: true }).optional(),
});

export type AttendanceCheckIn = z.infer<typeof attendanceCheckInSchema>;

export const attendanceWarningStatusEnum = z.enum([
  'EXPIRED',
  'PAUSED',
  'CANCELLED',
  'NO_MEMBERSHIP',
]);

export type AttendanceWarningStatus = z.infer<typeof attendanceWarningStatusEnum>;

export const attendanceCheckInResponseSchema = z.object({
  data: z.object({
    id: z.string().uuid(),
    memberId: z.string().uuid(),
    memberName: z.string(),
    occurredAt: z.string(),
    localDate: calendarDateSchema,
    source: attendanceSourceEnum,
    alreadyCheckedIn: z.boolean(),
    membershipWarning: z
      .object({
        status: attendanceWarningStatusEnum,
        message: z.string(),
      })
      .nullable(),
  }),
});

export type AttendanceCheckInResponse = z.infer<
  typeof attendanceCheckInResponseSchema
>;

export const attendanceListQuerySchema = z.object({
  memberId: z.string().uuid().optional(),
  startDate: calendarDateSchema.optional(),
  endDate: calendarDateSchema.optional(),
  source: attendanceSourceEnum.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type AttendanceListQuery = z.infer<typeof attendanceListQuerySchema>;

export const attendanceRecordItemSchema = z.object({
  id: z.string().uuid(),
  memberId: z.string().uuid(),
  memberName: z.string(),
  memberEmail: z.string().nullable().optional(),
  occurredAt: z.string(),
  localDate: calendarDateSchema,
  source: attendanceSourceEnum,
});

export type AttendanceRecordItem = z.infer<typeof attendanceRecordItemSchema>;

export const attendanceListResponseSchema = z.object({
  data: z.array(attendanceRecordItemSchema),
  pagination: z.object({
    total: z.number().int().nonnegative(),
    limit: z.number().int().positive(),
    offset: z.number().int().nonnegative(),
    hasMore: z.boolean(),
  }),
});

export type AttendanceListResponse = z.infer<typeof attendanceListResponseSchema>;

export const attendanceImportRequestSchema = z.object({
  csvContent: z.string().min(1, 'CSV content is required'),
  sourceName: z.string().trim().min(1).max(255).default('manual_upload.csv'),
  idempotencyKey: z.string().trim().min(1).max(255).optional(),
});

export type AttendanceImportRequest = z.input<
  typeof attendanceImportRequestSchema
>;
export type AttendanceImportRequestOutput = z.output<
  typeof attendanceImportRequestSchema
>;

export const attendanceImportRowErrorSchema = z.object({
  row: z.number().int().positive(),
  identifier: z.string().optional(),
  error: z.string(),
});

export type AttendanceImportRowError = z.infer<
  typeof attendanceImportRowErrorSchema
>;

export const attendanceImportResponseSchema = z.object({
  data: z.object({
    batchId: z.string().uuid(),
    sourceName: z.string(),
    idempotencyKey: z.string(),
    totalRows: z.number().int().nonnegative(),
    importedRows: z.number().int().nonnegative(),
    duplicateRows: z.number().int().nonnegative(),
    rejectedRows: z.number().int().nonnegative(),
    errors: z.array(attendanceImportRowErrorSchema),
  }),
});

export type AttendanceImportResponse = z.infer<
  typeof attendanceImportResponseSchema
>;

export const engagementMetricsSchema = z.object({
  totalAttendanceDays: z.number().int().nonnegative(),
  lastAttendanceDate: calendarDateSchema.nullable(),
  daysSinceLastVisit: z.number().int().nonnegative().nullable(),
  attendanceLast7Days: z.number().int().nonnegative().nullable(),
  attendanceLast30Days: z.number().int().nonnegative().nullable(),
  weeklyAverageFrequency: z.number().nonnegative().nullable(),
  changeConsecutive30Days: z
    .object({
      recent: z.number().int().nonnegative(),
      previous: z.number().int().nonnegative(),
      absoluteChange: z.number().int(),
      percentageDecline: z.number().nonnegative().nullable(),
    })
    .nullable(),
  coverageStatus: z.enum(['VERIFIED', 'INCOMPLETE', 'UNKNOWN']),
});

export type EngagementMetrics = z.infer<typeof engagementMetricsSchema>;
