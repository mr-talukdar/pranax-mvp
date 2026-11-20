import { NextResponse } from 'next/server';

import { getStudioContext } from '../../../../server/auth/context';
import { recordManualCheckIn } from '../../../../server/services/attendance';
import { attendanceCheckInSchema } from '@pranax/contracts';
import { ServiceError } from '../../../../server/services/errors';

export async function POST(request: Request) {
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid check-in payload.' },
      { status: 400 },
    );
  }

  const parsed = attendanceCheckInSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid check-in payload.', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const record = await recordManualCheckIn(context, parsed.data);
    const status = record.alreadyCheckedIn ? 200 : 201;
    return NextResponse.json({ data: record }, { status });
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode },
      );
    }
    console.error('Failed to record check-in', error);
    return NextResponse.json(
      { error: 'An unexpected server error occurred.' },
      { status: 500 },
    );
  }
}
