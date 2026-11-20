import { NextResponse } from 'next/server';
import { dashboardQuerySchema } from '@pranax/contracts';
import { getStudioContext } from '../../../server/auth/context';
import { getDashboardSummary } from '../../../server/services/dashboard';

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

  const { searchParams } = new URL(request.url);
  const rawParams: Record<string, string> = {};
  for (const [key, value] of searchParams.entries()) {
    rawParams[key] = value;
  }

  const parsed = dashboardQuerySchema.safeParse(rawParams);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid dashboard query parameters.', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const summary = await getDashboardSummary(context, parsed.data);
    return NextResponse.json({ data: summary });
  } catch (error) {
    console.error('Failed to compute dashboard metrics', error);
    return NextResponse.json(
      { error: 'An unexpected server error occurred while computing dashboard metrics.' },
      { status: 500 },
    );
  }
}
