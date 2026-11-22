import 'server-only';

import {
  assistantAnalyticsSchema,
  assistantAnswerSchema,
  assistantOperationRequestSchema,
  assistantQuestionSchema,
  assistantRoutingRequestSchema,
  assistantRoutingResponseSchema,
  assistantSuggestionsRequestSchema,
  assistantSuggestionsResponseSchema,
  type AssistantAnalytics,
  type AssistantAnswer,
  type AssistantOperation,
  type AssistantQuestion,
  type AssistantRoutingResponse,
  type AssistantSuggestionsResponse,
} from '@pranax/contracts';
import type { z } from 'zod';
import type { StudioContext } from '../auth/context';
import { getDashboardSummary, getStudioLocalDate } from './dashboard';

const intelligenceTimeoutMs = 12_000;

export class AssistantServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AssistantServiceError';
  }
}

async function getAnalytics(context: StudioContext): Promise<AssistantAnalytics> {
  const dashboard = await getDashboardSummary(context, {
    trendInterval: 'daily',
    trendDays: 14,
  });

  return assistantAnalyticsSchema.parse({
    asOfDate:
      dashboard.asOfDate ??
      getStudioLocalDate(new Date(), dashboard.studioTimezone ?? 'UTC'),
    totalMembers: dashboard.totalMembers,
    activeMembers: dashboard.activeMembers,
    newRegistrations: dashboard.newRegistrations,
    attendanceToday: dashboard.attendanceToday,
    expiringIn7Days: dashboard.expiringIn7Days,
    membershipBreakdown: {
      active: dashboard.membershipBreakdown.active,
      paused: dashboard.membershipBreakdown.paused,
      expiring: dashboard.membershipBreakdown.expiring,
      expired: dashboard.membershipBreakdown.expired,
    },
    retentionSummary: {
      assessmentsAvailable:
        dashboard.retentionSummary.lowCount +
          dashboard.retentionSummary.mediumCount +
          dashboard.retentionSummary.highCount +
          dashboard.retentionSummary.limitedCount >
        0,
      lowCount: dashboard.retentionSummary.lowCount,
      mediumCount: dashboard.retentionSummary.mediumCount,
      highCount: dashboard.retentionSummary.highCount,
      limitedCount: dashboard.retentionSummary.limitedCount,
    },
    attendanceTrends: dashboard.attendanceTrends.map(({ date, count }) => ({
      date,
      count,
    })),
  });
}

async function callIntelligence<T>(
  path: string,
  payload: unknown,
  responseSchema: z.ZodType<T>,
): Promise<T> {
  const baseUrl = process.env.INTELLIGENCE_URL;
  const serviceToken = process.env.INTELLIGENCE_SERVICE_TOKEN;
  if (!baseUrl || !serviceToken || serviceToken.length < 32) {
    throw new AssistantServiceError(
      'The studio assistant is not configured.',
    );
  }

  let endpoint: URL;
  try {
    endpoint = new URL(path, baseUrl);
  } catch {
    throw new AssistantServiceError(
      'The studio assistant is not configured.',
    );
  }
  if (
    endpoint.protocol !== 'https:' &&
    !['localhost', '127.0.0.1', '::1'].includes(endpoint.hostname)
  ) {
    throw new AssistantServiceError(
      'The studio assistant is not configured securely.',
    );
  }

  let response: Response;
  try {
    response = await globalThis.fetch(endpoint, {
      method: 'POST',
      cache: 'no-store',
      signal: AbortSignal.timeout(intelligenceTimeoutMs),
      headers: {
        authorization: `Bearer ${serviceToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new AssistantServiceError(
      'The studio assistant service is unavailable.',
    );
  }

  if (!response.ok) {
    throw new AssistantServiceError(
      'The studio assistant could not complete this request.',
    );
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new AssistantServiceError(
      'The studio assistant returned an invalid response.',
    );
  }

  const parsed = responseSchema.safeParse(body);
  if (!parsed.success) {
    throw new AssistantServiceError(
      'The studio assistant returned an invalid response.',
    );
  }
  return parsed.data;
}

export async function getAssistantSuggestions(
  context: StudioContext,
): Promise<AssistantSuggestionsResponse> {
  const analytics = await getAnalytics(context);
  const request = assistantSuggestionsRequestSchema.parse({
    studioId: context.studioId,
    analytics,
  });
  return callIntelligence(
    '/api/v1/assistant/suggestions',
    request,
    assistantSuggestionsResponseSchema,
  );
}

export async function routeStudioQuestion(
  context: StudioContext,
  input: AssistantQuestion,
): Promise<AssistantRoutingResponse> {
  const question = assistantQuestionSchema.parse(input);
  const request = assistantRoutingRequestSchema.parse({
    studioId: context.studioId,
    ...question,
  });
  return callIntelligence(
    '/api/v1/assistant/route',
    request,
    assistantRoutingResponseSchema,
  );
}

export async function answerStudioOperation(
  context: StudioContext,
  operation: AssistantOperation,
): Promise<AssistantAnswer> {
  const analytics = await getAnalytics(context);
  const request = assistantOperationRequestSchema.parse({
    studioId: context.studioId,
    operation,
    analytics,
  });
  return callIntelligence(
    '/api/v1/assistant/answer',
    request,
    assistantAnswerSchema,
  );
}
