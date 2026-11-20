import { NextResponse } from 'next/server';
import { retentionAssessmentResponseSchema } from '@pranax/contracts';
import { getStudioContext } from '../../../../../server/auth/context';
import { IntelligenceServiceError } from '../../../../../server/services/intelligence';
import {
  assessMemberRetention,
  persistRetentionAssessment,
} from '../../../../../server/services/retention';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ memberId: string }> },
) {
  const context = await getStudioContext(
    request.headers.get('x-studio-id') ?? undefined,
  );
  if (!context) {
    return NextResponse.json(
      { error: 'A verified studio context is required.' },
      { status: 401 },
    );
  }

  const { memberId } = await params;
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      memberId,
    )
  ) {
    return NextResponse.json({ error: 'Invalid member ID.' }, { status: 400 });
  }
  try {
    const assessment = await assessMemberRetention(context, memberId);
    if (!assessment) {
      return NextResponse.json({ error: 'Member not found.' }, { status: 404 });
    }
    const persistence = await persistRetentionAssessment(context, assessment);
    return NextResponse.json(
      retentionAssessmentResponseSchema.parse({
        data: assessment,
        persistence,
      }),
    );
  } catch (error) {
    if (error instanceof IntelligenceServiceError) {
      return NextResponse.json(
        { error: 'Retention assessment is temporarily unavailable.' },
        { status: 502 },
      );
    }
    console.error('Failed to assess member retention', {
      errorType: error instanceof Error ? error.name : 'UnknownError',
    });
    return NextResponse.json(
      { error: 'An unexpected server error occurred.' },
      { status: 500 },
    );
  }
}
