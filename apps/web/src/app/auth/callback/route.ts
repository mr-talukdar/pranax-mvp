import { NextResponse } from 'next/server';

import { setActiveStudioCookie } from '../../../server/auth/studio-cookie';
import { createSupabaseServerClient } from '../../../server/auth/supabase';
import { ensureUserStudio } from '../../../server/services/bootstrap';

function metadataString(
  metadata: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = metadata[key];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  if (!code) {
    return NextResponse.redirect(
      new URL('/auth?error=confirmation', requestUrl),
    );
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(
        new URL('/auth?error=confirmation', requestUrl),
      );
    }

    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      return NextResponse.redirect(
        new URL('/auth?error=confirmation', requestUrl),
      );
    }

    const studioName =
      metadataString(data.user.user_metadata, 'studio_name') || 'My Studio';
    const studio = await ensureUserStudio(data.user.id, studioName);
    await setActiveStudioCookie(studio.id);
    return NextResponse.redirect(new URL('/dashboard', requestUrl));
  } catch (error) {
    console.error('Email confirmation callback failed', error);
    return NextResponse.redirect(new URL('/auth?error=workspace', requestUrl));
  }
}
