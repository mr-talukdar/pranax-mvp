import { z } from 'zod';

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const dashboardQuerySchema = z.object({
  asOfDate: dateSchema.optional(),
  registrationWindowDays: z.coerce.number().int().positive().default(30),
  upcomingExpirationDays: z.coerce.number().int().positive().default(7),
  trendDays: z.coerce.number().int().positive().max(366).default(14),
  trendMonths: z.coerce.number().int().positive().max(36).default(12),
  trendInterval: z.enum(['daily', 'monthly']).default('daily'),
});

export type DashboardQueryInput = z.input<typeof dashboardQuerySchema>;
export type DashboardQueryOutput = z.output<typeof dashboardQuerySchema>;

export const membershipBreakdownSchema = z.object({
  active: z.number().int().nonnegative(),
  activePercent: z.number().min(0).max(100),
  paused: z.number().int().nonnegative(),
  pausedPercent: z.number().min(0).max(100),
  expiring: z.number().int().nonnegative(),
  expiringPercent: z.number().min(0).max(100),
  expired: z.number().int().nonnegative(),
  expiredPercent: z.number().min(0).max(100),
});

export type MembershipBreakdown = z.infer<typeof membershipBreakdownSchema>;

export const attendanceTrendItemSchema = z.object({
  date: dateSchema,
  label: z.string(),
  count: z.number().int().nonnegative(),
});

export type AttendanceTrendItem = z.infer<typeof attendanceTrendItemSchema>;

export const retentionSummarySchema = z.object({
  lowCount: z.number().int().nonnegative(),
  lowPercent: z.number().min(0).max(100),
  mediumCount: z.number().int().nonnegative(),
  mediumPercent: z.number().min(0).max(100),
  highCount: z.number().int().nonnegative(),
  highPercent: z.number().min(0).max(100),
  limitedCount: z.number().int().nonnegative(),
  limitedPercent: z.number().min(0).max(100),
});

export type RetentionSummary = z.infer<typeof retentionSummarySchema>;

export const attentionQueueCategorySchema = z.enum([
  'HIGH',
  'MEDIUM',
  'LIMITED',
]);
export type AttentionQueueCategory = z.infer<
  typeof attentionQueueCategorySchema
>;

export const attentionQueueItemSchema = z.object({
  memberId: z.string().uuid(),
  memberName: z.string().min(1),
  memberInitials: z.string().min(1).max(5),
  planName: z.string(),
  score: z.number().int().min(0).max(100),
  category: attentionQueueCategorySchema,
  daysAbsent: z.number().int().nonnegative(),
  cadenceDrop: z.string(),
  primaryRecommendation: z.string(),
  recommendationExplanation: z.string().optional(),
  keyFactors: z.array(z.string()),
});

export type AttentionQueueItemContract = z.infer<
  typeof attentionQueueItemSchema
>;

export const mlInsightsSchema = z.object({
  enabled: z.boolean(),
  modelStatus: z.enum(['ACTIVE', 'DISABLED', 'TRAINING']),
  highRiskChurnCount: z.number().int().nonnegative(),
});

export type MLInsights = z.infer<typeof mlInsightsSchema>;

export const dashboardKPIsSchema = z.object({
  activeMembers: z.number().int().nonnegative(),
  totalMembers: z.number().int().nonnegative(),
  newRegistrations: z.number().int().nonnegative(),
  attendanceToday: z.number().int().nonnegative(),
  highRiskCount: z.number().int().nonnegative(),
  expiringIn7Days: z.number().int().nonnegative(),
  membershipBreakdown: membershipBreakdownSchema,
  attendanceTrends: z.array(attendanceTrendItemSchema),
  retentionSummary: retentionSummarySchema,
  attentionQueue: z.array(attentionQueueItemSchema),
  studioTimezone: z.string().optional(),
  asOfDate: dateSchema.optional(),
  mlInsights: mlInsightsSchema.optional(),
});

export type DashboardKPIsContract = z.infer<typeof dashboardKPIsSchema>;

export const dashboardResponseSchema = z.object({
  data: dashboardKPIsSchema,
});

export type DashboardResponse = z.infer<typeof dashboardResponseSchema>;
