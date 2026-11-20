import 'server-only';

import { cookies } from 'next/headers';

const STUDIO_COOKIE = 'pranax-studio-id';

export async function setActiveStudioCookie(studioId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(STUDIO_COOKIE, studioId, {
    path: '/',
    sameSite: 'lax',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
  });
}

export async function clearActiveStudioCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(STUDIO_COOKIE);
}
