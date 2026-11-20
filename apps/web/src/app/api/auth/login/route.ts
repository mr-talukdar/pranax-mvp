import { NextResponse } from 'next/server';
import { z } from 'zod';

import { setActiveStudioCookie } from '../../../../server/auth/studio-cookie';
import { createSupabaseServerClient } from '../../../../server/auth/supabase';
import { ensureUserStudio } from '../../../../server/services/bootstrap';

const loginSchema = z
  .object({
    email: z.string().trim().email().max(254),
    password: z.string().min(1).max(128),
  })
  .strict();

function studioNameFromUser(user: {
  user_metadata?: Record<string, unknown>;
}): string {
  const name = user.user_metadata?.studio_name;
  return typeof name === 'string' && name.trim() ? name.trim() : 'My Studio';
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid sign-in details.' },
      { status: 400 },
    );
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Enter a valid email and password.' },
      { status: 400 },
    );
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
    if (error || !data.user || !data.session) {
      return NextResponse.json(
        { error: 'Email or password is incorrect.' },
        { status: 401 },
      );
    }

    const studio = await ensureUserStudio(
      data.user.id,
      studioNameFromUser(data.user),
    );
    await setActiveStudioCookie(studio.id);
    return NextResponse.json({ data: { signedIn: true } });
  } catch (error) {
    console.error('Sign-in failed', error);
    return NextResponse.json(
      { error: 'Sign-in is temporarily unavailable. Please try again.' },
      { status: 500 },
    );
  }
}
