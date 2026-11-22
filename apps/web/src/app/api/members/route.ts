import { NextResponse } from 'next/server';

import { getStudioContext, rejectDemoWrite } from '../../../server/auth/context';
import { createMember, listMembers } from '../../../server/services/members';
import { memberCreateSchema, memberListQuerySchema } from '@pranax/contracts';
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
  const queryParse = memberListQuerySchema.safeParse({
    search: searchParams.get('search') || undefined,
    status: searchParams.get('status') || undefined,
    directoryFilter: searchParams.get('directoryFilter') || undefined,
    limit: searchParams.get('limit') || undefined,
    offset: searchParams.get('offset') || undefined,
    sort: searchParams.get('sort') || undefined,
  });

  if (!queryParse.success) {
    return NextResponse.json(
      { error: 'Invalid query parameters.', details: queryParse.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const result = await listMembers(context, queryParse.data);
    return NextResponse.json(result);
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
    const member = await createMember(context, parsed.data);
    return NextResponse.json({ data: member }, { status: 201 });
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode },
      );
    }
    console.error('Failed to create member', error);
    return NextResponse.json(
      { error: 'An unexpected server error occurred.' },
      { status: 500 },
    );
  }
}
