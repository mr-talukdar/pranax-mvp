import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '../../../../server/auth/supabase';

const TARGET_STUDIO_ID = 'd9b73462-1111-4000-8000-000000000001';
const DEMO_EMAIL = 'demo-owner@ars-pilates.example.invalid';
const DEMO_PASSWORD = 'PranaX!Hde39+gxT6bc9ZrpYvjotqduiznD/0Fe$9A';

export async function GET() {
  return handleSession();
}

export async function POST() {
  return handleSession();
}

async function handleSession() {
  try {
    const supabase = await createSupabaseServerClient();
    const cookieStore = await cookies();

    // Check if valid session already exists
    const { data: checkData } = await supabase.auth.getUser();
    if (checkData.user) {
      cookieStore.set('pranax-studio-id', TARGET_STUDIO_ID, {
        path: '/',
        sameSite: 'lax',
      });
      const { data: sessionData } = await supabase.auth.getSession();
      return NextResponse.json({
        data: {
          user: checkData.user,
          accessToken: sessionData.session?.access_token ?? null,
          studioId: TARGET_STUDIO_ID,
        },
      });
    }

    // Sign in with demo credentials
    const { data: signInData, error: signInError } =
      await supabase.auth.signInWithPassword({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
      });

    if (signInError || !signInData.session) {
      return NextResponse.json(
        { error: 'Failed to establish demo session', details: signInError?.message },
        { status: 401 },
      );
    }

    cookieStore.set('pranax-studio-id', TARGET_STUDIO_ID, {
      path: '/',
      sameSite: 'lax',
    });

    return NextResponse.json({
      data: {
        user: signInData.user,
        accessToken: signInData.session.access_token,
        studioId: TARGET_STUDIO_ID,
      },
    });
  } catch (error) {
    console.error('Demo session resolution failure', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred establishing session.' },
      { status: 500 },
    );
  }
}
