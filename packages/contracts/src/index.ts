import { z } from 'zod';

export * from './retention.js';
export * from './dashboard.js';
export * from './members.js';
export * from './memberships.js';
export * from './attendance.js';
export * from './assistant.js';

export const healthResponseSchema = z.object({
  service: z.literal('api'),
  status: z.literal('ok'),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;
