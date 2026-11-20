import { NextResponse } from 'next/server';

import { getStudioContext } from '../../../server/auth/context';
import { listStudioAttendance } from '../../../server/services/attendance';
import { attendanceListQuerySchema } from '@pranax/contracts';
import { ServiceError } from '../../../server/services/errors';

export async function GET(request: Request) {
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

  const { searchParams } = new URL(request.url);
  const parsed = attendanceListQuerySchema.safeParse({
    memberId: searchParams.get('memberId') || undefined,
    startDate: searchParams.get('startDate') || undefined,
    endDate: searchParams.get('endDate') || undefined,
    source: searchParams.get('source') || undefined,
    limit: searchParams.get('limit') || undefined,
    offset: searchParams.get('offset') || undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid query parameters.', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const result = await listStudioAttendance(context, parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode },
      );
    }
    console.error('Failed to list studio attendance', error);
    return NextResponse.json(
      { error: 'An unexpected server error occurred.' },
      { status: 500 },
    );
  }
}
