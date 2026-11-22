import 'server-only';

import { cookies } from 'next/headers';
import { withVerifiedStudioContext } from '@pranax/database';
import { createSupabaseServerClient } from './supabase';

export type StudioContext = {
  authUserId: string;
  studioId: string;
  readOnly?: boolean;
};

export function isDemoAccount(email: string | undefined): boolean {
  const demoEmail = process.env.DEMO_ACCOUNT_EMAIL;
  return Boolean(demoEmail && email?.toLowerCase() === demoEmail.toLowerCase());
}

export async function getStudioContext(
  selectedStudioId?: string,
  authHeader?: string,
): Promise<StudioContext | undefined> {
  const supabase = await createSupabaseServerClient();
  const token = authHeader?.replace(/^Bearer\s+/i, '').trim();
  let { data, error } = token
    ? await supabase.auth.getUser(token)
    : await supabase.auth.getUser();
  if (token && (error || !data.user)) {
    // A stale client token must not hide a valid server cookie session.
    ({ data, error } = await supabase.auth.getUser());
  }
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

  return {
    authUserId: data.user.id,
    studioId,
    readOnly: isDemoAccount(data.user.email),
  };
}

export function rejectDemoWrite(context: StudioContext): Response | undefined {
  if (context.readOnly !== true) return undefined;
  return Response.json(
    { error: 'The demo studio is read-only. Create your own studio to make changes.' },
    { status: 403 },
  );
}
