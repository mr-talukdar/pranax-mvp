import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import type { RetentionAssessmentOutput } from '@pranax/contracts';
import {
  enrichRetentionRecommendation,
  generateRetentionRecommendation,
  synthesizeDynamicRecommendation,
} from './retentionRecommendation';

function createMockAssessment(
  overrides: Partial<RetentionAssessmentOutput> = {},
): RetentionAssessmentOutput {
  return {
    studio_id: 'd9b73462-1111-4000-8000-000000000001',
    member_id: 'member-test-1',
    assessment_date: '2026-11-20',
    assessed_at: '2026-11-20T08:00:00.000Z',
    scoring_version: 'retention-v1.0.0',
    status: 'COMPLETE',
    is_complete: true,
    lifecycle_state: 'ACTIVE',
    lifecycle_events: [],
    score: 0,
    category: 'LOW',
    dimensions: {},
    indicators: [
      {
        code: 'days_since_attendance',
        label: 'Days since attendance',
        value: 2,
        explanation: '2 days since last visit',
        available: true,
      },
      {
        code: 'recent_30_day_visits',
        label: 'Recent 30-day visits',
        value: 12,
        explanation: '12 visits in last 30 days',
        available: true,
      },
      {
        code: 'previous_30_day_visits',
        label: 'Previous 30-day visits',
        value: 11,
        explanation: '11 visits in previous 30 days',
        available: true,
      },
      {
        code: 'days_until_expiry',
        label: 'Days until expiry',
        value: 90,
        explanation: '90 days until expiry',
        available: true,
      },
    ],
    recommendation: {
      action: 'NO_INTERVENTION',
      priority: 'LOW',
      title: 'No intervention',
      explanation: 'Current indicators do not warrant a retention intervention.',
      trigger: 'LOW_RISK',
      evidence: [],
    },
    completeness_reasons: [],
    ...overrides,
  };
}

describe('retentionRecommendation service', () => {
  it('synthesizes dynamic contextual copy for low risk member', () => {
    const assessment = createMockAssessment({ score: 0, category: 'LOW' });
    const rec = synthesizeDynamicRecommendation(assessment);

    expect(rec.title).toContain('Optimal engagement maintained');
    expect(rec.explanation).toContain('peak retention health');
    expect(rec.explanation).toContain('12'); // dynamic visits
    expect(rec.action).toBe('NO_INTERVENTION');
    expect(rec.priority).toBe('LOW');
  });

  it('synthesizes dynamic contextual copy for high risk member with prolonged absence', () => {
    const assessment = createMockAssessment({
      score: 75,
      category: 'HIGH',
      indicators: [
        {
          code: 'days_since_attendance',
          label: 'Days since attendance',
          value: 38,
          explanation: '38 days absent',
          available: true,
        },
        {
          code: 'recent_30_day_visits',
          label: 'Recent visits',
          value: 0,
          explanation: '0 visits',
          available: true,
        },
        {
          code: 'previous_30_day_visits',
          label: 'Prev visits',
          value: 6,
          explanation: '6 visits',
          available: true,
        },
        {
          code: 'days_until_expiry',
          label: 'Days until expiry',
          value: 12,
          explanation: '12 days left',
          available: true,
        },
      ],
      recommendation: {
        action: 'RE_ENGAGEMENT',
        priority: 'HIGH',
        title: 'Re-engagement',
        explanation: 'The member has had a prolonged attendance absence.',
        trigger: 'PROLONGED_ABSENCE',
        evidence: [],
      },
    });

    const rec = synthesizeDynamicRecommendation(assessment);
    expect(rec.title).toContain('38d absence & expiry in 12d');
    expect(rec.explanation).toContain('38 days');
    expect(rec.explanation).toContain('12 days');
  });

  it('synthesizes dynamic contextual copy for medium risk member with upcoming renewal', () => {
    const assessment = createMockAssessment({
      score: 45,
      category: 'MEDIUM',
      indicators: [
        {
          code: 'days_since_attendance',
          label: 'Days since attendance',
          value: 5,
          explanation: '5 days absent',
          available: true,
        },
        {
          code: 'days_until_expiry',
          label: 'Days until expiry',
          value: 10,
          explanation: '10 days left',
          available: true,
        },
        {
          code: 'confirmed_renewal',
          label: 'Confirmed renewal',
          value: false,
          explanation: 'No renewal',
          available: true,
        },
      ],
      recommendation: {
        action: 'RENEWAL_CONVERSATION',
        priority: 'MEDIUM',
        title: 'Renewal conversation',
        explanation: 'Approaching expiry.',
        trigger: 'APPROACHING_EXPIRY',
        evidence: [],
      },
    });

    const rec = synthesizeDynamicRecommendation(assessment);
    expect(rec.title).toContain('Upcoming renewal check-in: 10 days remaining');
    expect(rec.explanation).toContain('10 days');
  });

  it('calls Gemini API when API key is provided and parses JSON recommendation', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    title: 'Custom AI Title: Early Renewal Focus',
                    explanation:
                      'AI generated advice tailored for Pilates studio retention.',
                  }),
                },
              ],
            },
          },
        ],
      }),
    });

    vi.stubGlobal('fetch', fetchMock);

    const assessment = createMockAssessment({ score: 50, category: 'MEDIUM' });
    const rec = await generateRetentionRecommendation(assessment, {
      apiKey: 'test-api-key',
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(rec.title).toBe('Custom AI Title: Early Renewal Focus');
    expect(rec.explanation).toBe(
      'AI generated advice tailored for Pilates studio retention.',
    );

    vi.unstubAllGlobals();
  });

  it('falls back to dynamic synthesis when Gemini API call fails', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('Network error'));
    vi.stubGlobal('fetch', fetchMock);

    const assessment = createMockAssessment({ score: 0, category: 'LOW' });
    const rec = await generateRetentionRecommendation(assessment, {
      apiKey: 'test-api-key',
    });

    expect(rec.title).toContain('Optimal engagement maintained');
    expect(rec.explanation).toContain('peak retention health');

    vi.unstubAllGlobals();
  });

  it('enriches assessment without mutating immutable fields', async () => {
    const assessment = createMockAssessment({ score: 20, category: 'LOW' });
    const enriched = await enrichRetentionRecommendation(assessment);

    expect(enriched.member_id).toBe(assessment.member_id);
    expect(enriched.score).toBe(20);
    expect(enriched.category).toBe('LOW');
    expect(enriched.recommendation.title).not.toBe('No intervention');
    expect(enriched.recommendation.title).toContain('Consistent attendance on track');
  });
});
