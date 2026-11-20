import 'server-only';

import { cookies } from 'next/headers';
import { withVerifiedStudioContext } from '@pranax/database';
import { createSupabaseServerClient } from './supabase';

export type StudioContext = {
  authUserId: string;
  studioId: string;
};

export async function getStudioContext(
  selectedStudioId?: string,
  authHeader?: string,
): Promise<StudioContext | undefined> {
  const supabase = await createSupabaseServerClient();
  const token = authHeader?.replace(/^Bearer\s+/i, '').trim();
  const { data, error } = token
    ? await supabase.auth.getUser(token)
    : await supabase.auth.getUser();
  if (error || !data.user) {
    return undefined;
  }

  const cookieStore = await cookies();
  const studioId =
    selectedStudioId?.trim() ||
    cookieStore.get('pranax-studio-id')?.value?.trim();
  if (!studioId) {
    return undefined;
  }

  try {
    await withVerifiedStudioContext(data.user.id, studioId, async (tx) => {
      const membership = await tx.studioUser.findFirst({
        where: { studioId, authUserId: data.user.id },
        select: { id: true },
      });
      return membership?.id ?? null;
    });
  } catch {
    return undefined;
  }

  return { authUserId: data.user.id, studioId };
}
