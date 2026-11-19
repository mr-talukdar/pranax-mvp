import { describe, expect, it } from 'vitest';
import {
  memberCreateSchema,
  retentionAssessmentOutputSchema,
} from './index.js';

describe('memberCreateSchema', () => {
  it('accepts required member data and rejects invalid email addresses', () => {
    expect(
      memberCreateSchema.parse({ firstName: 'Ada', lastName: 'Lovelace' }),
    ).toMatchObject({
      firstName: 'Ada',
      lastName: 'Lovelace',
    });
    expect(
      memberCreateSchema.safeParse({
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'invalid',
      }).success,
    ).toBe(false);
  });
});

describe('retentionAssessmentOutputSchema', () => {
  it('accepts a typed limited assessment and rejects fabricated scores', () => {
    const response = {
      studio_id: 'studio-1',
      member_id: 'member-1',
      assessment_date: '2026-01-31',
      assessed_at: '2026-01-31T18:29:59.999999+00:00',
      scoring_version: 'retention-v1.0.0',
      status: 'LIMITED',
      is_complete: false,
      lifecycle_state: 'ACTIVE',
      lifecycle_events: [],
      score: null,
      category: null,
      dimensions: {},
      indicators: [],
      recommendation: {
        action: 'VERIFY_DATA',
        priority: 'NONE',
        title: 'Verify member records',
        explanation: 'Coverage is incomplete.',
        trigger: 'LIMITED_ASSESSMENT',
        evidence: [],
      },
      completeness_reasons: [
        'Attendance coverage is not verified as complete.',
      ],
    };

    expect(retentionAssessmentOutputSchema.parse(response)).toMatchObject(
      response,
    );
    expect(
      retentionAssessmentOutputSchema.safeParse({ ...response, score: 101 })
        .success,
    ).toBe(false);
  });
});
