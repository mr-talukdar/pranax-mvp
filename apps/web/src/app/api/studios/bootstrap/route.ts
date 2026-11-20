import { NextResponse } from 'next/server';
import { z } from 'zod';

import { createSupabaseServerClient } from '../../../../server/auth/supabase';
import { bootstrapStudio } from '../../../../server/services/bootstrap';

const bootstrapSchema = z
  .object({ name: z.string().trim().min(1).max(120) })
  .strict();

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return NextResponse.json(
      { error: 'Authentication is required.' },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid studio data.' },
      { status: 400 },
    );
  }

  const parsed = bootstrapSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid studio data.' },
      { status: 400 },
    );
  }

  try {
    const studioId = await bootstrapStudio(data.user.id, parsed.data.name);
    return NextResponse.json({ data: { studioId } }, { status: 201 });
  } catch (cause) {
    if (
      cause instanceof Error &&
      cause.message.includes('already belongs to a studio')
    ) {
      return NextResponse.json(
        { error: 'Studio ownership is already established.' },
        { status: 409 },
      );
    }
    if (
      cause instanceof Error &&
      cause.message.includes('authenticated user is required')
    ) {
      return NextResponse.json(
        { error: 'Authentication is required.' },
        { status: 401 },
      );
    }
    console.error('Failed to bootstrap studio', cause);
    return NextResponse.json(
      { error: 'Unable to create studio.' },
      { status: 500 },
    );
  }
}
