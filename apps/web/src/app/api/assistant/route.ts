import { NextResponse } from 'next/server';
import {
  assistantAnswerSchema,
  assistantQuestionSchema,
} from '@pranax/contracts';
import { getStudioContext } from '../../../server/auth/context';
import {
  answerStudioOperation,
  AssistantServiceError,
  getAssistantSuggestions,
  routeStudioQuestion,
} from '../../../server/services/assistant';

const maximumRequestBytes = 16_384;

function unauthorizedResponse() {
  return NextResponse.json(
    { error: 'Sign in to use the studio assistant.' },
    { status: 401, headers: { 'Cache-Control': 'private, no-store' } },
  );
}

function unavailableResponse(error: unknown) {
  if (error instanceof AssistantServiceError) {
    return NextResponse.json(
      { error: error.message },
      { status: 503, headers: { 'Cache-Control': 'private, no-store' } },
    );
  }
  return NextResponse.json(
    { error: 'The studio assistant is temporarily unavailable.' },
    { status: 500, headers: { 'Cache-Control': 'private, no-store' } },
  );
}

export async function GET() {
  const context = await getStudioContext();
  if (!context) return unauthorizedResponse();

  try {
    const data = await getAssistantSuggestions(context);
    return NextResponse.json(
      { data },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    console.error('Failed to load studio assistant suggestions', error);
    return unavailableResponse(error);
  }
}

export async function POST(request: Request) {
  const context = await getStudioContext();
  if (!context) return unauthorizedResponse();

  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > maximumRequestBytes) {
    return NextResponse.json(
      { error: 'This assistant request is too large.' },
      { status: 413 },
    );
  }

  let body: unknown;
  try {
    const text = await request.text();
    if (new TextEncoder().encode(text).byteLength > maximumRequestBytes) {
      return NextResponse.json(
        { error: 'This assistant request is too large.' },
        { status: 413 },
      );
    }
    body = JSON.parse(text) as unknown;
  } catch {
    return NextResponse.json(
      { error: 'The assistant request must contain valid JSON.' },
      { status: 400 },
    );
  }

  const parsed = assistantQuestionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Enter a question and try again.', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const routing = await routeStudioQuestion(context, parsed.data);
    const data =
      routing.scope === 'OUT_OF_SCOPE' || routing.operation === null
        ? assistantAnswerSchema.parse({
            scope: 'OUT_OF_SCOPE',
            operation: null,
            answer:
              routing.scope === 'OUT_OF_SCOPE'
                ? routing.message
                : 'I could not match that to a supported studio analytics question. Try one of the suggestions.',
            evidence: [],
            mode: 'DETERMINISTIC',
          })
        : await answerStudioOperation(context, routing.operation);
    return NextResponse.json(
      { data },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    console.error('Failed to answer studio assistant question', error);
    return unavailableResponse(error);
  }
}
