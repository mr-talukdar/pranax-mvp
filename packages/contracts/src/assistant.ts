import { z } from 'zod';

const countSchema = z.number().int().nonnegative();
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const assistantOperationSchema = z.enum([
  'attendance_summary',
  'membership_summary',
  'retention_summary',
  'studio_overview',
]);
export type AssistantOperation = z.infer<typeof assistantOperationSchema>;

export const assistantModeSchema = z.enum(['GEMINI', 'DETERMINISTIC']);
export type AssistantMode = z.infer<typeof assistantModeSchema>;

export const assistantAnalyticsSchema = z.object({
  asOfDate: dateSchema,
  totalMembers: countSchema,
  activeMembers: countSchema,
  newRegistrations: countSchema,
  attendanceToday: countSchema,
  expiringIn7Days: countSchema,
  membershipBreakdown: z.object({
    active: countSchema,
    paused: countSchema,
    expiring: countSchema,
    expired: countSchema,
  }),
  retentionSummary: z.object({
    assessmentsAvailable: z.boolean(),
    lowCount: countSchema,
    mediumCount: countSchema,
    highCount: countSchema,
    limitedCount: countSchema,
  }),
  attendanceTrends: z
    .array(
      z.object({
        date: dateSchema,
        count: countSchema,
      }),
    )
    .max(14),
});
export type AssistantAnalytics = z.infer<typeof assistantAnalyticsSchema>;

export const assistantHistoryMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().trim().min(1).max(1200),
});

export const assistantSuggestionsResponseSchema = z.object({
  suggestions: z
    .array(
      z.object({
        operation: assistantOperationSchema,
        question: z.string().trim().min(1).max(180),
      }),
    )
    .max(3),
  mode: assistantModeSchema,
});
export type AssistantSuggestionsResponse = z.infer<
  typeof assistantSuggestionsResponseSchema
>;

export const assistantSuggestionsRequestSchema = z.object({
  studioId: z.string().min(1).max(100),
  analytics: assistantAnalyticsSchema,
});

export const assistantQuestionSchema = z.object({
  question: z.string().trim().min(1).max(500),
  history: z.array(assistantHistoryMessageSchema).max(8).default([]),
});
export type AssistantQuestion = z.infer<typeof assistantQuestionSchema>;

export const assistantRoutingRequestSchema = assistantQuestionSchema.extend({
  studioId: z.string().min(1).max(100),
});

export const assistantRoutingResponseSchema = z.object({
  scope: z.enum(['IN_SCOPE', 'OUT_OF_SCOPE']),
  operation: assistantOperationSchema.nullable(),
  message: z.string().trim().min(1).max(500),
});
export type AssistantRoutingResponse = z.infer<
  typeof assistantRoutingResponseSchema
>;

export const assistantOperationRequestSchema = z.object({
  studioId: z.string().min(1).max(100),
  operation: assistantOperationSchema,
  analytics: assistantAnalyticsSchema,
});

export const assistantAnswerSchema = z.object({
  scope: z.enum(['IN_SCOPE', 'OUT_OF_SCOPE']),
  operation: assistantOperationSchema.nullable(),
  answer: z.string().trim().min(1).max(1200),
  evidence: z
    .array(
      z.object({
        id: z.string().min(1).max(60),
        label: z.string().min(1).max(120),
        value: z.string().min(1).max(180),
      }),
    )
    .max(6),
  mode: assistantModeSchema,
});
export type AssistantAnswer = z.infer<typeof assistantAnswerSchema>;

