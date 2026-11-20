import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createSupabaseServerClientMock, cookiesMock, withVerifiedStudioContextMock } = vi.hoisted(() => ({
  createSupabaseServerClientMock: vi.fn(),
  cookiesMock: vi.fn(),
  withVerifiedStudioContextMock: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({
  cookies: cookiesMock,
}));
vi.mock('./supabase', () => ({
  createSupabaseServerClient: createSupabaseServerClientMock,
}));
vi.mock('@pranax/database', () => ({
  withVerifiedStudioContext: withVerifiedStudioContextMock,
}));

import { getStudioContext } from './context';

describe('getStudioContext server-side resolution', () => {
  const demoUserId = '52dd5e42-1f35-4889-bc25-6ac55cbb61c8';
  const targetStudioId = 'd9b73462-1111-4000-8000-000000000001';
  const foreignStudioId = 'd9b73462-2222-4000-8000-000000000002';

  let mockCookieStore: { get: ReturnType<typeof vi.fn> };
  let mockSupabase: { auth: { getUser: ReturnType<typeof vi.fn> } };

  beforeEach(() => {
    vi.clearAllMocks();

    mockCookieStore = {
      get: vi.fn().mockImplementation((name: string) => {
        if (name === 'pranax-studio-id') {
          return { value: targetStudioId };
        }
        return undefined;
      }),
    };
    cookiesMock.mockResolvedValue(mockCookieStore);

    mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: demoUserId } },
          error: null,
        }),
      },
    };
    createSupabaseServerClientMock.mockResolvedValue(mockSupabase);

    withVerifiedStudioContextMock.mockImplementation(async (userId, studioId, callback) => {
      if (userId === demoUserId && studioId === targetStudioId) {
        const fakeTx = {
          studioUser: {
            findFirst: vi.fn().mockResolvedValue({ id: 'su-1', role: 'OWNER' }),
          },
        };
        return callback(fakeTx);
      }
      throw new Error('Authenticated user is not a member of the selected studio.');
    });
  });

  it('correctly resolves context and confirms membership for valid studio', async () => {
    const context = await getStudioContext(targetStudioId);
    expect(context).toEqual({
      authUserId: demoUserId,
      studioId: targetStudioId,
    });
    expect(withVerifiedStudioContextMock).toHaveBeenCalledWith(
      demoUserId,
      targetStudioId,
      expect.any(Function),
    );
  });

  it('falls back to pranax-studio-id cookie when selectedStudioId is omitted', async () => {
    const context = await getStudioContext();
    expect(context).toEqual({
      authUserId: demoUserId,
      studioId: targetStudioId,
    });
    expect(mockCookieStore.get).toHaveBeenCalledWith('pranax-studio-id');
  });

  it('rejects cross-studio access when requested studio does not match membership', async () => {
    const context = await getStudioContext(foreignStudioId);
    expect(context).toBeUndefined();
    expect(withVerifiedStudioContextMock).toHaveBeenCalledWith(
      demoUserId,
      foreignStudioId,
      expect.any(Function),
    );
  });

  it('rejects when user is not authenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error('Not authenticated'),
    });

    const context = await getStudioContext(targetStudioId);
    expect(context).toBeUndefined();
    expect(withVerifiedStudioContextMock).not.toHaveBeenCalled();
  });

  it('rejects when user membership is revoked or absent', async () => {
    withVerifiedStudioContextMock.mockRejectedValue(
      new Error('Authenticated user is not a member of the selected studio.'),
    );

    const context = await getStudioContext(targetStudioId);
    expect(context).toBeUndefined();
  });

  it('rejects when studioId cannot be determined', async () => {
    mockCookieStore.get.mockReturnValue(undefined);

    const context = await getStudioContext();
    expect(context).toBeUndefined();
    expect(withVerifiedStudioContextMock).not.toHaveBeenCalled();
  });
});
