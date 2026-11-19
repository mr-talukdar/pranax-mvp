import { PrismaClient } from '@prisma/client';
import type { Prisma } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export { PrismaClient } from '@prisma/client';

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type StudioTransaction = Prisma.TransactionClient;

/**
 * Runs database work in a transaction with a server-established studio scope.
 * The setting is transaction-local and cannot leak through the connection pool.
 */
export async function withStudioContext<T>(
  studioId: string,
  callback: (tx: StudioTransaction) => Promise<T>,
): Promise<T> {
  if (!uuidPattern.test(studioId)) {
    throw new Error('studioId must be a UUID');
  }

  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.studio_id', ${studioId}, true)`;
    return callback(tx);
  });
}
