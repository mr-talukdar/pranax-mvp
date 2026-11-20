import { afterAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { withVerifiedStudioContext } from '@pranax/database';
import { bootstrapStudio } from './bootstrap';
import { vi } from 'vitest';

const enabled = process.env.PRANAX_BOOTSTRAP_INTEGRATION === '1';
const testUserIds = [randomUUID(), randomUUID()];
const studiosByUser = new Map<string, Set<string>>();

vi.mock('server-only', () => ({}));

describe.skipIf(!enabled)('first studio bootstrap integration', () => {
  afterAll(async () => {
    for (const [authUserId, studioIds] of studiosByUser) {
      for (const studioId of studioIds) {
        await withVerifiedStudioContext(authUserId, studioId, async (tx) => {
          await tx.studio.deleteMany({ where: { id: studioId } });
        });
      }
    }
  });

  it('creates one OWNER studio under concurrent and repeated requests', async () => {
    const attempts = await Promise.allSettled([
      bootstrapStudio(testUserIds[0], 'Bootstrap integration'),
      bootstrapStudio(testUserIds[0], 'Concurrent retry'),
    ]);
    for (const attempt of attempts) {
      if (attempt.status === 'fulfilled') {
        const studios = studiosByUser.get(testUserIds[0]) ?? new Set<string>();
        studios.add(attempt.value);
        studiosByUser.set(testUserIds[0], studios);
      }
    }
    for (const attempt of attempts) {
      if (attempt.status === 'rejected') throw attempt.reason;
    }
    const [first, concurrent] = attempts.map((attempt) =>
      attempt.status === 'fulfilled' ? attempt.value : '',
    );
    expect(first).toBe(concurrent);
    expect(await bootstrapStudio(testUserIds[0], 'Repeated retry')).toBe(first);

    const owner = await withVerifiedStudioContext(
      testUserIds[0],
      first,
      async (tx) => {
        const membership = await tx.studioUser.findFirstOrThrow({
          where: { studioId: first, authUserId: testUserIds[0] },
          select: { role: true },
        });
        const studiosForUser = await tx.studioUser.count({
          where: { authUserId: testUserIds[0] },
        });
        return { role: membership.role, studiosForUser };
      },
    );
    expect(owner).toEqual({ role: 'OWNER', studiosForUser: 1 });
  });

  it('rejects an empty Auth subject', async () => {
    await expect(bootstrapStudio('', 'Unauthenticated')).rejects.toThrow();
  });

  it('does not expose a way to choose a different initial owner', async () => {
    const studioId = await bootstrapStudio(testUserIds[1], 'Second identity');
    studiosByUser.set(testUserIds[1], new Set([studioId]));
    const membership = await withVerifiedStudioContext(
      testUserIds[1],
      studioId,
      (tx) =>
        tx.studioUser.findFirstOrThrow({
          where: { studioId, authUserId: testUserIds[1] },
          select: { authUserId: true, role: true },
        }),
    );
    expect(membership).toEqual({ authUserId: testUserIds[1], role: 'OWNER' });
  });
});
