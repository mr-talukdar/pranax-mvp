import { NextResponse } from 'next/server';

import { getStudioContext } from '../../../../server/auth/context';
import { importAttendanceCsv } from '../../../../server/services/attendance';
import { attendanceImportRequestSchema } from '@pranax/contracts';
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

  const contentType = request.headers.get('content-type') || '';
  let csvContent = '';
  let sourceName = 'upload.csv';
  let idempotencyKey: string | undefined;

  try {
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file');
      if (file && typeof file === 'object' && 'text' in file) {
        csvContent = await (file as Blob).text();
        sourceName = (file as File).name || 'upload.csv';
      } else {
        const rawContent = formData.get('csvContent');
        if (typeof rawContent === 'string') {
          csvContent = rawContent;
        }
      }
      const rawSourceName = formData.get('sourceName');
      if (typeof rawSourceName === 'string' && rawSourceName) {
        sourceName = rawSourceName;
      }
      const rawKey = formData.get('idempotencyKey');
      if (typeof rawKey === 'string' && rawKey) {
        idempotencyKey = rawKey;
      }
    } else {
      const body = await request.json();
      const parsed = attendanceImportRequestSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Invalid CSV import payload.', details: parsed.error.flatten() },
          { status: 400 },
        );
      }
      csvContent = parsed.data.csvContent;
      sourceName = parsed.data.sourceName;
      idempotencyKey = parsed.data.idempotencyKey;
    }
  } catch {
    return NextResponse.json(
      { error: 'Invalid CSV upload request.' },
      { status: 400 },
    );
  }

  if (!csvContent.trim()) {
    return NextResponse.json(
      { error: 'CSV file content cannot be empty.' },
      { status: 400 },
    );
  }

  try {
    const result = await importAttendanceCsv(context, {
      csvContent,
      sourceName,
      idempotencyKey,
    });
    return NextResponse.json({ data: result }, { status: 200 });
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode },
      );
    }
    console.error('Failed to import attendance CSV', error);
    return NextResponse.json(
      { error: 'An unexpected server error occurred.' },
      { status: 500 },
    );
  }
}
