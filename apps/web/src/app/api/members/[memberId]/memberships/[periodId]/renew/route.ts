import { NextResponse } from 'next/server';

import { getStudioContext } from '../../../../../../../server/auth/context';
import { renewMembership } from '../../../../../../../server/services/memberships';
import { membershipRenewSchema } from '@pranax/contracts';
import { ServiceError } from '../../../../../../../server/services/errors';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ memberId: string; periodId: string }> },
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

  const { memberId, periodId } = await params;
  let body: unknown = {};
  try {
    const text = await request.text();
    if (text) {
      body = JSON.parse(text);
    }
  } catch {
    return NextResponse.json(
      { error: 'Invalid renewal payload.' },
      { status: 400 },
    );
  }

  const parsed = membershipRenewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid renewal payload.', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const renewed = await renewMembership(
      context,
      memberId,
      periodId,
      parsed.data,
    );
    return NextResponse.json({ data: renewed }, { status: 201 });
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode },
      );
    }
    console.error('Failed to renew membership', error);
    return NextResponse.json(
      { error: 'An unexpected server error occurred.' },
      { status: 500 },
    );
  }
}
