import { NextResponse } from 'next/server';

import { clearActiveStudioCookie } from '../../../../server/auth/studio-cookie';
import { createSupabaseServerClient } from '../../../../server/auth/supabase';

export async function POST() {
  try {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
    await clearActiveStudioCookie();
    return NextResponse.json({ data: { signedOut: true } });
  } catch (error) {
    console.error('Sign-out failed', error);
    return NextResponse.json(
      { error: 'Sign-out is temporarily unavailable. Please try again.' },
      { status: 500 },
    );
  }
}
