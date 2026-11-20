import 'server-only';

import type { StudioContext } from '../auth/context';
import {
  assessMemberRetention,
  persistRetentionAssessment,
} from './retention';

/**
 * Triggers non-blocking retention recalculation for a member.
 * If the analytical service is unavailable or errors, the operation logs a warning
 * and never throws, preventing rollback of primary operations.
 */
export async function triggerMemberRetentionReassessment(
  context: StudioContext,
  memberId: string,
): Promise<void> {
  try {
    const assessment = await assessMemberRetention(context, memberId);
    if (assessment) {
      await persistRetentionAssessment(context, assessment);
    }
  } catch (error) {
    console.warn(
      `Non-blocking retention reassessment deferred for member ${memberId}:`,
      error instanceof Error ? error.message : error,
    );
  }
}
