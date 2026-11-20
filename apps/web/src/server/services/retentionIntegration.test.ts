import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { triggerMemberRetentionReassessment } from './retentionTrigger';

const { assessMemberRetention, persistRetentionAssessment } = vi.hoisted(
  () => ({
    assessMemberRetention: vi.fn(),
    persistRetentionAssessment: vi.fn(),
  }),
);

vi.mock('./retention', () => ({
  assessMemberRetention,
  persistRetentionAssessment,
}));

const context = {
  authUserId: 'user-1',
  studioId: '00000000-0000-4000-8000-000000000001',
};

describe('Retention Intelligence Integration (F03 Event Bridge)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('triggers reassessment and persists snapshot when assessment is complete', async () => {
    const mockAssessment = {
      studio_id: context.studioId,
      member_id: 'member-1',
      assessment_date: '2026-06-25',
      assessed_at: '2026-06-25T09:30:00Z',
      scoring_version: 'retention-v1.0.0',
      status: 'COMPLETE' as const,
      is_complete: true,
      lifecycle_state: 'ACTIVE' as const,
      lifecycle_events: [],
      score: 35,
      category: 'MEDIUM' as const,
      dimensions: {},
      indicators: [],
      recommendation: {
        action: 'CHECK_IN',
        priority: 'MEDIUM',
        title: 'Check in with member',
        explanation: 'Visits slowed',
        trigger: 'DECLINE',
        evidence: [],
      },
      completeness_reasons: [],
    };

    assessMemberRetention.mockResolvedValue(mockAssessment);
    persistRetentionAssessment.mockResolvedValue({
      outcome: 'PERSISTED',
      snapshot_id: 'snap-1',
    });

    await triggerMemberRetentionReassessment(context, 'member-1');

    expect(assessMemberRetention).toHaveBeenCalledWith(context, 'member-1');
    expect(persistRetentionAssessment).toHaveBeenCalledWith(
      context,
      mockAssessment,
    );
  });

  it('does not fail business operation when intelligence service is temporarily unavailable', async () => {
    assessMemberRetention.mockRejectedValue(
      new Error('Retention assessment service is unavailable.'),
    );

    // Must resolve cleanly without throwing
    await expect(
      triggerMemberRetentionReassessment(context, 'member-1'),
    ).resolves.toBeUndefined();

    expect(persistRetentionAssessment).not.toHaveBeenCalled();
  });

  it('does not throw when intelligence service returns an unexpected rejection', async () => {
    assessMemberRetention.mockRejectedValue('Fatal network error');

    await expect(
      triggerMemberRetentionReassessment(context, 'member-1'),
    ).resolves.toBeUndefined();
  });
});
