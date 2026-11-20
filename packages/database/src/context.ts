import type { Prisma } from '@prisma/client';
import { prisma } from './client.js';

export async function withVerifiedStudioContext<T>(
  authUserId: string,
  studioId: string,
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
  options?: { maxWait?: number; timeout?: number },
): Promise<T> {
  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT set_config('role', 'authenticated', true)`;
      await tx.$executeRaw`SELECT set_config('request.jwt.claim.sub', ${authUserId}, true)`;
      const membership = await tx.studioUser.findFirst({
        where: { authUserId, studioId },
        select: { id: true },
      });
      if (!membership) {
        throw new Error(
          'Authenticated user is not a member of the selected studio.',
        );
      }
      return operation(tx);
    },
    {
      maxWait: options?.maxWait ?? 15_000,
      timeout: options?.timeout ?? 60_000,
    },
  );
}
