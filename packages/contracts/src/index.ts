import { z } from 'zod';

export * from './retention.js';

export const memberCreateSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  email: z.string().email().optional(),
  phone: z.string().trim().max(30).optional(),
});

export type MemberCreate = z.infer<typeof memberCreateSchema>;

export const healthResponseSchema = z.object({
  service: z.literal('api'),
  status: z.literal('ok'),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;
