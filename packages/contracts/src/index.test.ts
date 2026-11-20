import { describe, expect, it } from 'vitest';
import {
  memberCreateSchema,
  retentionAssessmentResponseSchema,
  retentionAssessmentOutputSchema,
  retentionHistoryResponseSchema,
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

describe('retention snapshot API contracts', () => {
  it('requires a typed persistence outcome alongside the existing assessment', () => {
    const assessment = {
      studio_id: 'studio-1',
      member_id: 'member-1',
      assessment_date: '2026-01-31',
      assessed_at: '2026-01-31T18:29:59.999Z',
      scoring_version: 'retention-v1.0.0',
      status: 'COMPLETE',
      is_complete: true,
      lifecycle_state: 'ACTIVE',
      lifecycle_events: [],
      score: 42,
      category: 'MEDIUM',
      dimensions: {},
      indicators: [],
      recommendation: {
        action: 'CONTACT_MEMBER',
        priority: 'MEDIUM',
        title: 'Check in with the member',
        explanation: 'Attendance has declined.',
        trigger: 'ATTENDANCE_DECLINE',
        evidence: [],
      },
      completeness_reasons: [],
    };
    expect(
      retentionAssessmentResponseSchema.parse({
        data: assessment,
        persistence: {
          outcome: 'PERSISTED',
          snapshot_id: '00000000-0000-4000-8000-000000000001',
        },
      }).persistence.outcome,
    ).toBe('PERSISTED');
    expect(
      retentionAssessmentResponseSchema.safeParse({
        data: assessment,
        persistence: { outcome: 'SUCCESS', snapshot_id: null },
      }).success,
    ).toBe(false);
  });

  it('validates chronological history item fields and pagination', () => {
    expect(
      retentionHistoryResponseSchema.safeParse({
        items: [],
        pagination: { limit: 30, offset: 0, has_more: false },
      }).success,
    ).toBe(true);
    expect(
      retentionHistoryResponseSchema.safeParse({
        items: [],
        pagination: { limit: 0, offset: 0, has_more: false },
      }).success,
    ).toBe(false);
  });
});
