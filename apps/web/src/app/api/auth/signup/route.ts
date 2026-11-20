import { NextResponse } from 'next/server';
import { z } from 'zod';

import { setActiveStudioCookie } from '../../../../server/auth/studio-cookie';
import { createSupabaseServerClient } from '../../../../server/auth/supabase';
import { ensureUserStudio } from '../../../../server/services/bootstrap';

const signupSchema = z
  .object({
    fullName: z.string().trim().min(1).max(120),
    studioName: z.string().trim().min(1).max(120),
    email: z.string().trim().email().max(254),
    password: z.string().min(8).max(128),
  })
  .strict();

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid sign-up details.' },
      { status: 400 },
    );
  }

  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          'Enter your name, studio name, email, and a password of at least 8 characters.',
      },
      { status: 400 },
    );
  }

  try {
    const supabase = await createSupabaseServerClient();
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
    const emailRedirectTo = new URL('/auth/callback', siteUrl).toString();
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo,
        data: {
          full_name: parsed.data.fullName,
          studio_name: parsed.data.studioName,
        },
      },
    });

    if (error || !data.user) {
      return NextResponse.json(
        {
          error:
            'We could not create the account. Check the details or sign in.',
        },
        { status: 400 },
      );
    }

    if (!data.session) {
      return NextResponse.json(
        { data: { needsEmailConfirmation: true } },
        { status: 202 },
      );
    }

    const studio = await ensureUserStudio(data.user.id, parsed.data.studioName);
    await setActiveStudioCookie(studio.id);
    return NextResponse.json(
      { data: { needsEmailConfirmation: false } },
      { status: 201 },
    );
  } catch (error) {
    console.error('Account creation failed', error);
    return NextResponse.json(
      {
        error: 'Account creation is temporarily unavailable. Please try again.',
      },
      { status: 500 },
    );
  }
}
