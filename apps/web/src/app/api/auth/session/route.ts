import { NextResponse } from 'next/server';

import { setActiveStudioCookie } from '../../../../server/auth/studio-cookie';
import { createSupabaseServerClient } from '../../../../server/auth/supabase';
import { ensureUserStudio } from '../../../../server/services/bootstrap';

function stringMetadata(
  metadata: Record<string, unknown> | undefined,
  key: string,
): string | undefined {
  const value = metadata?.[key];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      return NextResponse.json(
        { error: 'Authentication is required.' },
        { status: 401 },
      );
    }

    const fullName = stringMetadata(data.user.user_metadata, 'full_name');
    const studioName =
      stringMetadata(data.user.user_metadata, 'studio_name') || 'My Studio';
    const studio = await ensureUserStudio(data.user.id, studioName);
    await setActiveStudioCookie(studio.id);

    const response = NextResponse.json({
      data: {
        user: {
          id: data.user.id,
          email: data.user.email ?? '',
          name: fullName || data.user.email?.split('@')[0] || 'Studio owner',
        },
        studio,
      },
    });
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  } catch (error) {
    console.error('Failed to load authenticated workspace', error);
    return NextResponse.json(
      { error: 'Unable to load this workspace right now.' },
      { status: 500 },
    );
  }
}
