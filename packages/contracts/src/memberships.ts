import { z } from 'zod';
import { membershipStatusEnum } from './members.js';

export const defaultPlanTypeSchema = z.enum(['MONTHLY', 'QUARTERLY', 'ANNUAL']);
export type DefaultPlanType = z.infer<typeof defaultPlanTypeSchema>;

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
export const calendarDateSchema = z
  .string()
  .regex(dateRegex, 'Must be a valid date in YYYY-MM-DD format');

export const membershipPauseRecordSchema = z.object({
  id: z.string().uuid(),
  startsAt: calendarDateSchema,
  resumesAt: calendarDateSchema.nullable(),
  durationDays: z.number().int().nonnegative().nullable(),
  createdAt: z.string(),
});

export type MembershipPauseRecord = z.infer<typeof membershipPauseRecordSchema>;

export const membershipPeriodDetailSchema = z.object({
  id: z.string().uuid(),
  memberId: z.string().uuid(),
  planId: z.string().uuid(),
  planName: z.string(),
  durationDays: z.number().int().positive(),
  priceCents: z.number().int().nonnegative(),
  startsAt: calendarDateSchema,
  originalEndsAt: calendarDateSchema,
  effectiveEndsAt: calendarDateSchema,
  status: membershipStatusEnum,
  renewedFromId: z.string().uuid().nullable(),
  cancelledAt: z.string().nullable(),
  createdAt: z.string(),
  pauses: z.array(membershipPauseRecordSchema).default([]),
});

export type MembershipPeriodDetail = z.infer<typeof membershipPeriodDetailSchema>;

export const membershipCreateSchema = z.object({
  planType: defaultPlanTypeSchema.optional(),
  planId: z.string().uuid().optional(),
  startsAt: calendarDateSchema.optional(),
}).refine((data) => data.planType !== undefined || data.planId !== undefined, {
  message: 'Either planType (MONTHLY, QUARTERLY, ANNUAL) or planId must be provided',
});

export type MembershipCreate = z.infer<typeof membershipCreateSchema>;

export const membershipRenewSchema = z.object({
  planType: defaultPlanTypeSchema.optional(),
  planId: z.string().uuid().optional(),
  startsAt: calendarDateSchema.optional(),
});

export type MembershipRenew = z.infer<typeof membershipRenewSchema>;

export const membershipPauseSchema = z.object({
  startsAt: calendarDateSchema.optional(),
  reason: z.string().trim().max(255).optional(),
});

export type MembershipPause = z.infer<typeof membershipPauseSchema>;

export const membershipResumeSchema = z.object({
  resumesAt: calendarDateSchema.optional(),
});

export type MembershipResume = z.infer<typeof membershipResumeSchema>;

export const membershipCancelSchema = z.object({
  effectiveDate: calendarDateSchema.optional(),
  reason: z.string().trim().max(255).optional(),
});

export type MembershipCancel = z.infer<typeof membershipCancelSchema>;
