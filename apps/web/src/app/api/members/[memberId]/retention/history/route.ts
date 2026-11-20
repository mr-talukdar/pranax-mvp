import { NextResponse } from 'next/server';
import { getStudioContext } from '../../../../../../server/auth/context';
import { getMemberRetentionHistory } from '../../../../../../server/services/retention';

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function paginationValue(
  value: string | null,
  fallback: number,
): number | null {
  if (value === null) return fallback;
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

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
      { error: 'A verified studio context is required.' },
      { status: 401 },
    );
  }

  const { memberId } = await params;
  if (!uuidPattern.test(memberId)) {
    return NextResponse.json({ error: 'Invalid member ID.' }, { status: 400 });
  }

  const url = new URL(request.url);
  const limit = paginationValue(url.searchParams.get('limit'), 30);
  const offset = paginationValue(url.searchParams.get('offset'), 0);
  if (
    limit === null ||
    offset === null ||
    limit < 1 ||
    limit > 100 ||
    offset > 100_000
  ) {
    return NextResponse.json(
      {
        error:
          'Invalid pagination. Limit must be 1–100 and offset must be at most 100000.',
      },
      { status: 400 },
    );
  }

  try {
    const history = await getMemberRetentionHistory(
      context,
      memberId,
      limit,
      offset,
    );
    if (!history) {
      return NextResponse.json({ error: 'Member not found.' }, { status: 404 });
    }
    return NextResponse.json(history);
  } catch (error) {
    console.error('Failed to retrieve retention history', {
      errorType: error instanceof Error ? error.name : 'UnknownError',
    });
    return NextResponse.json(
      { error: 'Retention history is temporarily unavailable.' },
      { status: 500 },
    );
  }
}
