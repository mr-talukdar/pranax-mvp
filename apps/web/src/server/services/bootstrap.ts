import 'server-only';

import { prisma } from '@pranax/database';

export type UserStudio = {
  id: string;
  name: string;
  timezone: string;
  isSynthetic: boolean;
  role: 'OWNER' | 'MANAGER';
};

export async function bootstrapStudio(authUserId: string, name: string) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('role', 'authenticated', true)`;
    await tx.$executeRaw`SELECT set_config('request.jwt.claim.sub', ${authUserId}, true)`;
    const rows = await tx.$queryRaw<Array<{ studioId: string }>>`
      SELECT pranax_private.bootstrap_first_studio(${name}) AS "studioId"
    `;
    return rows[0].studioId;
  });
}

export async function getUserStudio(
  authUserId: string,
): Promise<UserStudio | null> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('role', 'authenticated', true)`;
    await tx.$executeRaw`SELECT set_config('request.jwt.claim.sub', ${authUserId}, true)`;
    const membership = await tx.studioUser.findFirst({
      where: { authUserId },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: {
        role: true,
        studio: {
          select: { id: true, name: true, timezone: true, isSynthetic: true },
        },
      },
    });
    return membership ? { ...membership.studio, role: membership.role } : null;
  });
}

export async function ensureUserStudio(
  authUserId: string,
  requestedName: string,
): Promise<UserStudio> {
  const existing = await getUserStudio(authUserId);
  if (existing) return existing;

  const studioName = requestedName.trim().slice(0, 120) || 'My Studio';
  await bootstrapStudio(authUserId, studioName);
  const created = await getUserStudio(authUserId);
  if (!created) {
    throw new Error('Studio bootstrap did not create an accessible studio.');
  }
  return created;
}
