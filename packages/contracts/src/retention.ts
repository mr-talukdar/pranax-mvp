import { z } from 'zod';

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const timestampSchema = z.string().datetime({ offset: true });

export const coverageGapSchema = z.object({
  start_date: dateSchema,
  end_date: dateSchema,
});

export const attendanceCoverageSchema = z.object({
  start_date: dateSchema.nullable(),
  end_date: dateSchema.nullable(),
  verified_at: timestampSchema.nullable(),
  complete: z.boolean(),
  gaps: z.array(coverageGapSchema),
});

export const attendanceEvidenceSchema = z.object({
  occurred_at: timestampSchema,
  recorded_at: timestampSchema,
  local_date: dateSchema,
});

export const membershipPeriodEvidenceSchema = z.object({
  id: z.string().min(1).max(100),
  starts_at: dateSchema,
  original_ends_at: dateSchema,
  effective_ends_at: dateSchema,
  status: z.enum(['ACTIVE', 'PAUSED', 'EXPIRED', 'CANCELLED']),
  renewed_from_id: z.string().min(1).max(100).nullable(),
  recorded_at: timestampSchema,
  cancelled_at: timestampSchema.nullable(),
});

export const membershipPauseEvidenceSchema = z.object({
  id: z.string().min(1).max(100),
  period_id: z.string().min(1).max(100),
  starts_at: dateSchema,
  resumes_at: dateSchema.nullable(),
  recorded_at: timestampSchema,
});

export const retentionAssessmentInputSchema = z.object({
  studio_id: z.string().min(1).max(100),
  member_id: z.string().min(1).max(100),
  timezone: z.string().min(1).max(100),
  assessment_date: dateSchema,
  attendance_coverage: attendanceCoverageSchema,
  membership_history_complete: z.boolean(),
  attendance: z.array(attendanceEvidenceSchema),
  membership_periods: z.array(membershipPeriodEvidenceSchema),
  membership_pauses: z.array(membershipPauseEvidenceSchema).max(1000),
});

export const retentionRiskCategorySchema = z.enum(['LOW', 'MEDIUM', 'HIGH']);
export const retentionAssessmentStatusSchema = z.enum([
  'COMPLETE',
  'LIMITED',
  'EXCLUDED',
]);
export const retentionLifecycleStateSchema = z.enum([
  'ACTIVE',
  'PAUSED',
  'EXPIRED',
  'LAPSED',
  'CHURNED',
  'REACTIVATED',
  'UNKNOWN',
]);
export const retentionLifecycleEventSchema = z.object({
  event_type: z.enum(['CHURN', 'REACTIVATION']),
  event_date: dateSchema,
  membership_period_id: z.string(),
});

export const retentionIndicatorSchema = z.object({
  code: z.string(),
  label: z.string(),
  value: z.union([z.string(), z.number(), z.boolean()]).nullable(),
  explanation: z.string(),
  available: z.boolean(),
});

export const retentionDimensionSchema = z.object({
  score: z.number().int().min(0).max(100).nullable(),
  configured_weight: z.number().int().nonnegative(),
  applied_weight: z.number().nonnegative(),
  available: z.boolean(),
  explanation: z.string(),
  indicators: z.array(retentionIndicatorSchema),
});

export const retentionRecommendationSchema = z.object({
  action: z.string(),
  priority: z.string(),
  title: z.string(),
  explanation: z.string(),
  trigger: z.string(),
  evidence: z.array(retentionIndicatorSchema),
});

export const retentionAssessmentOutputSchema = z.object({
  studio_id: z.string(),
  member_id: z.string(),
  assessment_date: dateSchema,
  assessed_at: timestampSchema,
  scoring_version: z.string(),
  status: retentionAssessmentStatusSchema,
  is_complete: z.boolean(),
  lifecycle_state: retentionLifecycleStateSchema,
  lifecycle_events: z.array(retentionLifecycleEventSchema),
  score: z.number().int().min(0).max(100).nullable(),
  category: retentionRiskCategorySchema.nullable(),
  dimensions: z.record(z.string(), retentionDimensionSchema),
  indicators: z.array(retentionIndicatorSchema),
  recommendation: retentionRecommendationSchema,
  completeness_reasons: z.array(z.string()),
});

export type RetentionAssessmentInput = z.infer<
  typeof retentionAssessmentInputSchema
>;
export type RetentionAssessmentOutput = z.infer<
  typeof retentionAssessmentOutputSchema
>;
