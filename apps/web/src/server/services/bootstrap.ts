import 'server-only';

import { prisma } from '@pranax/database';

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
