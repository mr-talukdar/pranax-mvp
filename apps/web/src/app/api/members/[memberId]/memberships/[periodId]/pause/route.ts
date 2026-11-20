import { NextResponse } from 'next/server';

import { getStudioContext } from '../../../../../../../server/auth/context';
import { pauseMembership } from '../../../../../../../server/services/memberships';
import { membershipPauseSchema } from '@pranax/contracts';
import { ServiceError } from '../../../../../../../server/services/errors';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ memberId: string; periodId: string }> },
) {
  const context = await getStudioContext(
    request.headers.get('x-studio-id') ?? undefined,
  );
  if (!context) {
    return NextResponse.json(
      { error: 'A server-established studio context is required.' },
      { status: 401 },
    );
  }

  const { memberId, periodId } = await params;
  let body: unknown = {};
  try {
    const text = await request.text();
    if (text) {
      body = JSON.parse(text);
    }
  } catch {
    return NextResponse.json(
      { error: 'Invalid pause payload.' },
      { status: 400 },
    );
  }

  const parsed = membershipPauseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid pause payload.', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const result = await pauseMembership(
      context,
      memberId,
      periodId,
      parsed.data,
    );
    return NextResponse.json({ data: result }, { status: 200 });
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode },
      );
    }
    console.error('Failed to pause membership', error);
    return NextResponse.json(
      { error: 'An unexpected server error occurred.' },
      { status: 500 },
    );
  }
}
