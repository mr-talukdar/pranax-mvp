import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createSupabaseServerClient, bootstrapStudio } = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
  bootstrapStudio: vi.fn(),
}));

vi.mock('../../../../server/auth/supabase', () => ({
  createSupabaseServerClient,
}));
vi.mock('../../../../server/services/bootstrap', () => ({ bootstrapStudio }));

import { POST } from './route';

describe('POST /api/studios/bootstrap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createSupabaseServerClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'verified-user' } },
          error: null,
        }),
      },
    });
    bootstrapStudio.mockResolvedValue('studio-id');
  });

  it('bootstraps for the verified identity and returns the studio id', async () => {
    const response = await POST(
      new Request('http://localhost/api/studios/bootstrap', {
        method: 'POST',
        body: JSON.stringify({ name: 'Studio One' }),
      }),
    );
    expect(response.status).toBe(201);
    expect(bootstrapStudio).toHaveBeenCalledWith('verified-user', 'Studio One');
    expect(await response.json()).toEqual({ data: { studioId: 'studio-id' } });
  });

  it('rejects unauthenticated requests without invoking bootstrap', async () => {
    createSupabaseServerClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: new Error('no session'),
        }),
      },
    });
    const response = await POST(
      new Request('http://localhost/api/studios/bootstrap', {
        method: 'POST',
        body: JSON.stringify({ name: 'Studio One' }),
      }),
    );
    expect(response.status).toBe(401);
    expect(bootstrapStudio).not.toHaveBeenCalled();
  });

  it('does not accept a browser-supplied identity', async () => {
    const response = await POST(
      new Request('http://localhost/api/studios/bootstrap', {
        method: 'POST',
        body: JSON.stringify({ name: 'Studio One', authUserId: 'attacker' }),
      }),
    );
    expect(response.status).toBe(400);
    expect(bootstrapStudio).not.toHaveBeenCalled();
  });

  it('returns the existing studio idempotently for duplicate requests', async () => {
    bootstrapStudio.mockResolvedValue('same-studio-id');
    const request = () =>
      POST(
        new Request('http://localhost/api/studios/bootstrap', {
          method: 'POST',
          body: JSON.stringify({ name: 'Studio One' }),
        }),
      );
    const first = await request();
    const second = await request();
    expect((await first.json()).data.studioId).toBe(
      (await second.json()).data.studioId,
    );
  });
});
