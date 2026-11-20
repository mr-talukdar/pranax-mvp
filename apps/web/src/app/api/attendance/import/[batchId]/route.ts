import { NextResponse } from 'next/server';

import { getStudioContext } from '../../../../../server/auth/context';
import { getImportBatchById } from '../../../../../server/services/attendance';
import { ServiceError } from '../../../../../server/services/errors';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ batchId: string }> },
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

  const { batchId } = await params;
  try {
    const batch = await getImportBatchById(context, batchId);
    if (!batch) {
      return NextResponse.json(
        { error: `Import batch "${batchId}" not found in current studio.` },
        { status: 404 },
      );
    }
    return NextResponse.json({ data: batch });
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode },
      );
    }
    console.error('Failed to get import batch', error);
    return NextResponse.json(
      { error: 'An unexpected server error occurred.' },
      { status: 500 },
    );
  }
}
