import { NextResponse } from 'next/server';

import { getStudioContext, rejectDemoWrite } from '../../../../../server/auth/context';
import {
  createMembership,
  getMembershipHistory,
} from '../../../../../server/services/memberships';
import { membershipCreateSchema } from '@pranax/contracts';
import { ServiceError } from '../../../../../server/services/errors';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ memberId: string }> },
) {
  const context = await getStudioContext(
    request.headers.get('x-studio-id') ?? undefined,
    request.headers.get('authorization') ?? undefined,
  );
  if (!context) {
    return NextResponse.json(
      { error: 'A server-established studio context is required.' },
      { status: 401 },
    );
  }
  const { memberId } = await params;
  try {
    const history = await getMembershipHistory(context, memberId);
    return NextResponse.json({ data: history });
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode },
      );
    }
    console.error('Failed to get membership history', error);
    return NextResponse.json(
      { error: 'An unexpected server error occurred.' },
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ memberId: string }> },
) {
  const context = await getStudioContext(
    request.headers.get('x-studio-id') ?? undefined,
    request.headers.get('authorization') ?? undefined,
  );
  if (!context) {
    return NextResponse.json(
      { error: 'A server-established studio context is required.' },
      { status: 401 },
    );
  }
  const readOnlyResponse = rejectDemoWrite(context);
  if (readOnlyResponse) return readOnlyResponse;

  const { memberId } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid membership payload.' },
      { status: 400 },
    );
  }

  const parsed = membershipCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid membership payload.', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const created = await createMembership(context, memberId, parsed.data);
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode },
      );
    }
    console.error('Failed to create membership', error);
    return NextResponse.json(
      { error: 'An unexpected server error occurred.' },
      { status: 500 },
    );
  }
}
