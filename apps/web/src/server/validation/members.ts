import 'server-only';

import { z } from 'zod';

export const memberCreateSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  email: z.string().email().optional(),
  phone: z.string().trim().max(30).optional(),
});

export type MemberCreateInput = z.infer<typeof memberCreateSchema>;
