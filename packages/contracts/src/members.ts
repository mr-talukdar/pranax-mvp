import { z } from 'zod';

export const memberCreateSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(100),
  lastName: z.string().trim().min(1, 'Last name is required').max(100),
  email: z
    .string()
    .trim()
    .email('Invalid email address')
    .max(255)
    .optional()
    .or(z.literal('').transform(() => undefined)),
  phone: z
    .string()
    .trim()
    .max(30)
    .optional()
    .or(z.literal('').transform(() => undefined)),
});

export type MemberCreate = z.infer<typeof memberCreateSchema>;

export const memberUpdateSchema = z.object({
  firstName: z.string().trim().min(1, 'First name cannot be empty').max(100).optional(),
  lastName: z.string().trim().min(1, 'Last name cannot be empty').max(100).optional(),
  email: z
    .string()
    .trim()
    .email('Invalid email address')
    .max(255)
    .nullable()
    .optional()
    .or(z.literal('').transform(() => null)),
  phone: z
    .string()
    .trim()
    .max(30)
    .nullable()
    .optional()
    .or(z.literal('').transform(() => null)),
});

export type MemberUpdate = z.infer<typeof memberUpdateSchema>;

export const membershipStatusEnum = z.enum([
  'ACTIVE',
  'PAUSED',
  'EXPIRED',
  'CANCELLED',
]);

export type MembershipStatus = z.infer<typeof membershipStatusEnum>;

export const memberFilterStatusEnum = z.enum([
  'ACTIVE',
  'PAUSED',
  'EXPIRED',
  'CANCELLED',
  'NO_MEMBERSHIP',
]);

export type MemberFilterStatus = z.infer<typeof memberFilterStatusEnum>;

export const memberDirectoryFilterEnum = z.enum([
  'all',
  'active',
  'paused',
  'expiring',
  'high_risk',
  'new',
]);

export type MemberDirectoryFilter = z.infer<typeof memberDirectoryFilterEnum>;

export const memberListQuerySchema = z.object({
  search: z.string().trim().optional(),
  status: memberFilterStatusEnum.optional(),
  directoryFilter: memberDirectoryFilterEnum.default('all'),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  sort: z.enum(['name_asc', 'name_desc', 'joined_desc']).default('name_asc'),
});

export type MemberListQuery = z.infer<typeof memberListQuerySchema>;

export const memberSummarySchema = z.object({
  id: z.string().uuid(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  joinedAt: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  lastVisit: z.string().datetime({ offset: true }).nullable().optional(),
  retentionCategory: z.enum(['LOW', 'MEDIUM', 'HIGH', 'LIMITED']).nullable().optional(),
  retentionScore: z.number().int().min(0).max(100).nullable().optional(),
  currentMembership: z
    .object({
      id: z.string().uuid(),
      planId: z.string().uuid(),
      planName: z.string(),
      status: membershipStatusEnum,
      startsAt: z.string(),
      effectiveEndsAt: z.string(),
    })
    .nullable(),
});

export type MemberSummary = z.infer<typeof memberSummarySchema>;

export const memberListResponseSchema = z.object({
  data: z.array(memberSummarySchema),
  pagination: z.object({
    total: z.number().int().nonnegative(),
    limit: z.number().int().positive(),
    offset: z.number().int().nonnegative(),
    hasMore: z.boolean(),
  }),
});

export type MemberListResponse = z.infer<typeof memberListResponseSchema>;
