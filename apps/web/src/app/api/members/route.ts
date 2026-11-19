import { NextResponse } from 'next/server';

import { getStudioContext } from '../../../server/auth/context';
import { createMember, listMembers } from '../../../server/services/members';
import { memberCreateSchema } from '../../../server/validation/members';

export async function GET(request: Request) {
  const context = await getStudioContext(
    request.headers.get('x-studio-id') ?? undefined,
  );
  if (!context) {
    return NextResponse.json(
      { error: 'A server-established studio context is required.' },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json({ data: await listMembers(context) });
  } catch (error) {
    console.error('Failed to list members', error);
    return NextResponse.json(
      { error: 'An unexpected server error occurred.' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const context = await getStudioContext(
    request.headers.get('x-studio-id') ?? undefined,
  );
  if (!context) {
    return NextResponse.json(
      { error: 'A server-established studio context is required.' },
      { status: 400 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid member data.' },
      { status: 400 },
    );
  }

  const parsed = memberCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid member data.', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json(
      { data: await createMember(context, parsed.data) },
      { status: 201 },
    );
  } catch (error) {
    console.error('Failed to create member', error);
    return NextResponse.json(
      { error: 'An unexpected server error occurred.' },
      { status: 500 },
    );
  }
}
