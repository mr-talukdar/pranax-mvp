import 'server-only';

import {
  retentionAssessmentInputSchema,
  retentionAssessmentOutputSchema,
  type RetentionAssessmentInput,
  type RetentionAssessmentOutput,
} from '@pranax/contracts';
import type { StudioContext } from '../auth/context';

const requestTimeoutMs = 5_000;

export class IntelligenceServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IntelligenceServiceError';
  }
}

/** Calls the private analytics service with a studio ID from verified server context. */
export async function assessRetention(
  context: StudioContext,
  input: Omit<RetentionAssessmentInput, 'studio_id'>,
): Promise<RetentionAssessmentOutput> {
  const baseUrl = process.env.INTELLIGENCE_URL;
  const serviceToken = process.env.INTELLIGENCE_SERVICE_TOKEN;
  if (!baseUrl || !serviceToken || serviceToken.length < 32) {
    throw new IntelligenceServiceError(
      'Retention assessment service is not configured.',
    );
  }

  const request = retentionAssessmentInputSchema.parse({
    ...input,
    studio_id: context.studioId,
  });
  let endpoint: URL;
  try {
    endpoint = new URL('/api/v1/retention/assess', baseUrl);
  } catch {
    throw new IntelligenceServiceError(
      'Retention assessment service is not configured.',
    );
  }
  if (
    endpoint.protocol !== 'https:' &&
    !['localhost', '127.0.0.1', '::1'].includes(endpoint.hostname)
  ) {
    throw new IntelligenceServiceError(
      'Retention assessment service is not configured securely.',
    );
  }
  let response: Response;
  try {
    response = await globalThis.fetch(endpoint, {
      method: 'POST',
      cache: 'no-store',
      signal: AbortSignal.timeout(requestTimeoutMs),
      headers: {
        authorization: `Bearer ${serviceToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(request),
    });
  } catch {
    throw new IntelligenceServiceError(
      'Retention assessment service is unavailable.',
    );
  }

  if (!response.ok) {
    throw new IntelligenceServiceError(
      'Retention assessment could not be completed.',
    );
  }
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new IntelligenceServiceError(
      'Retention assessment service returned an invalid response.',
    );
  }
  const parsed = retentionAssessmentOutputSchema.safeParse(body);
  if (
    !parsed.success ||
    parsed.data.studio_id !== context.studioId ||
    parsed.data.member_id !== input.member_id
  ) {
    throw new IntelligenceServiceError(
      'Retention assessment service returned an invalid response.',
    );
  }
  return parsed.data;
}
