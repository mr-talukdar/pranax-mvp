import { NextResponse } from 'next/server';

import { getStudioContext } from '../../../../server/auth/context';
import { getMemberById, updateMember } from '../../../../server/services/members';
import { memberUpdateSchema } from '@pranax/contracts';
import { ServiceError } from '../../../../server/services/errors';
import { withVerifiedStudioContext } from '@pranax/database';
import { calculateMemberEngagementMetrics } from '../../../../server/services/attendance';

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
  if (!memberId) {
    return NextResponse.json({ error: 'Member ID is required.' }, { status: 400 });
  }

  try {
    const member = await getMemberById(context, memberId);
    if (!member) {
      return NextResponse.json(
        { error: `Member "${memberId}" was not found in the current studio.` },
        { status: 404 },
      );
    }

    const metrics = await withVerifiedStudioContext(
      context.authUserId,
      context.studioId,
      async (tx) => {
        const studio = await tx.studio.findUniqueOrThrow({
          where: { id: context.studioId },
          select: { timezone: true },
        });
        return calculateMemberEngagementMetrics(
          tx,
          context.studioId,
          memberId,
          studio.timezone,
        );
      },
    );

    return NextResponse.json({
      data: {
        ...member,
        metrics,
      },
    });
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode },
      );
    }
    console.error('Failed to get member', error);
    return NextResponse.json(
      { error: 'An unexpected server error occurred.' },
      { status: 500 },
    );
  }
}

export async function PATCH(
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
  if (!memberId) {
    return NextResponse.json({ error: 'Member ID is required.' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid update payload.' },
      { status: 400 },
    );
  }

  const parsed = memberUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid update payload.', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const updated = await updateMember(context, memberId, parsed.data);
    return NextResponse.json({ data: updated });
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode },
      );
    }
    console.error('Failed to update member', error);
    return NextResponse.json(
      { error: 'An unexpected server error occurred.' },
      { status: 500 },
    );
  }
}
