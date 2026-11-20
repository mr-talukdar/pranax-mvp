import 'server-only';

import type {
  RetentionAssessmentOutput,
  RetentionIndicator,
  RetentionRecommendation,
} from '@pranax/contracts';

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
}

function getIndicatorValue<T = unknown>(
  assessment: RetentionAssessmentOutput,
  code: string,
): T | null {
  const direct = assessment.indicators?.find((i) => i.code === code);
  if (direct && direct.value !== null && direct.value !== undefined) {
    return direct.value as T;
  }
  if (assessment.dimensions) {
    for (const dim of Object.values(assessment.dimensions)) {
      const found = dim.indicators?.find((i) => i.code === code);
      if (found && found.value !== null && found.value !== undefined) {
        return found.value as T;
      }
    }
  }
  return null;
}

/**
 * Deterministic dynamic synthesis fallback for retention recommendations.
 * Derives personalized, contextual copy from the member's raw metrics and indicators
 * without hardcoding static text or failing when offline/unauthenticated.
 */
export function synthesizeDynamicRecommendation(
  assessment: RetentionAssessmentOutput,
): RetentionRecommendation {
  const score = assessment.score;
  const category = assessment.category;
  const status = assessment.status;
  const lifecycle = assessment.lifecycle_state;

  const daysSinceAttendance = getIndicatorValue<number>(
    assessment,
    'days_since_attendance',
  );
  const declinePercent = getIndicatorValue<number>(
    assessment,
    'attendance_decline_percent',
  );
  const recentVisits = getIndicatorValue<number>(
    assessment,
    'recent_30_day_visits',
  );
  const previousVisits = getIndicatorValue<number>(
    assessment,
    'previous_30_day_visits',
  );
  const daysUntilExpiry = getIndicatorValue<number>(
    assessment,
    'days_until_expiry',
  );
  const confirmedRenewal = getIndicatorValue<boolean>(
    assessment,
    'confirmed_renewal',
  );
  const cadenceDeterioration = getIndicatorValue<number>(
    assessment,
    'cadence_deterioration_percent',
  );
  const personalCadence = getIndicatorValue<number>(
    assessment,
    'personal_cadence_days',
  );
  const completedRenewals = getIndicatorValue<number>(
    assessment,
    'completed_renewal_opportunities',
  );
  const nonRenewalRate = getIndicatorValue<number>(
    assessment,
    'non_renewal_rate_percent',
  );

  const action = assessment.recommendation.action;
  const priority = assessment.recommendation.priority;
  const trigger = assessment.recommendation.trigger;
  const evidence: RetentionIndicator[] = assessment.recommendation.evidence ?? [];

  let title = assessment.recommendation.title;
  let explanation = assessment.recommendation.explanation;

  if (category === 'LOW') {
    if (score !== null && score === 0) {
      title = 'Optimal engagement maintained (score 0/100)';
      explanation = `Member demonstrates peak retention health with ${recentVisits ?? 'regular'} check-ins over the past 30 days and stable workout cadence. No retention intervention needed.`;
    } else if (daysSinceAttendance !== null && daysSinceAttendance <= 7) {
      title = `Consistent attendance on track (score ${score ?? 0}/100)`;
      explanation = `Active routine confirmed with last visit ${daysSinceAttendance}d ago and steady habit. Maintain standard studio experience.`;
    } else {
      title = `Healthy member engagement (score ${score ?? 0}/100)`;
      explanation = `Retention metrics remain strong with active lifecycle status. Continue standard member communications.`;
    }
  } else if (category === 'HIGH') {
    if (
      daysSinceAttendance !== null &&
      daysSinceAttendance >= 30 &&
      daysUntilExpiry !== null &&
      daysUntilExpiry <= 21 &&
      !confirmedRenewal
    ) {
      title = `Critical churn risk: ${daysSinceAttendance}d absence & expiry in ${daysUntilExpiry}d`;
      explanation = `Immediate owner outreach required: member has been inactive for ${daysSinceAttendance} days with current membership ending in ${daysUntilExpiry} days without renewal.`;
    } else if (
      daysSinceAttendance !== null &&
      daysSinceAttendance >= 30 ||
      trigger === 'PROLONGED_ABSENCE'
    ) {
      title = `Urgent re-engagement: Inactive for ${daysSinceAttendance ?? '30+'} days`;
      explanation = `Dormancy alert: Member has zero visits in ${daysSinceAttendance ?? 30} days (${recentVisits ?? 0} in last 30d vs ${previousVisits ?? 0} prior). Contact member directly to diagnose obstacles.`;
    } else if (
      daysUntilExpiry !== null &&
      daysUntilExpiry <= 7 &&
      !confirmedRenewal
    ) {
      title = `Immediate renewal required: Expires in ${daysUntilExpiry} days`;
      explanation = `Active membership expires in ${daysUntilExpiry} days with no scheduled renewal. Reach out today to secure continuation.`;
    } else if (declinePercent !== null && declinePercent >= 50) {
      title = `Severe attendance drop: ${declinePercent}% reduction`;
      explanation = `Visit frequency dropped sharply from ${previousVisits ?? 0} to ${recentVisits ?? 0} sessions over 30 days. Check in to identify schedule changes or satisfaction issues.`;
    } else if (nonRenewalRate !== null && nonRenewalRate >= 50) {
      title = `High renewal resistance: ${nonRenewalRate}% non-renewal rate`;
      explanation = `Member has not renewed across ${completedRenewals ?? 'multiple'} past opportunities. Explore alternative plan options or session pack structures.`;
    } else {
      title = `High risk intervention (score ${score ?? 70}/100)`;
      explanation = `Multiple elevated retention indicators detected${daysSinceAttendance !== null ? ` (${daysSinceAttendance}d since last visit)` : ''}${daysUntilExpiry !== null ? ` with ${daysUntilExpiry}d until expiry` : ''}. Schedule owner check-in.`;
    }
  } else if (category === 'MEDIUM') {
    if (
      daysUntilExpiry !== null &&
      daysUntilExpiry <= 14 &&
      !confirmedRenewal
    ) {
      title = `Upcoming renewal check-in: ${daysUntilExpiry} days remaining`;
      explanation = `Membership term ends in ${daysUntilExpiry} days (${recentVisits ?? 0} visits logged recently). Initiate proactive renewal conversation before the grace period.`;
    } else if (declinePercent !== null && declinePercent >= 25) {
      title = `Engagement softening: ${declinePercent}% drop in monthly visits`;
      explanation = `Visit cadence slowed from ${previousVisits ?? 0} to ${recentVisits ?? 0} visits in the past month. Send a supportive check-in to re-energize attendance.`;
    } else if (daysSinceAttendance !== null && daysSinceAttendance >= 14) {
      title = `Re-engagement prompt: ${daysSinceAttendance} days since last session`;
      explanation = `Member has been away for ${daysSinceAttendance} days despite active membership status. A friendly class recommendation or check-in is advised.`;
    } else if (cadenceDeterioration !== null && cadenceDeterioration >= 25) {
      title = `Cadence drift: Interval lengthened by ${cadenceDeterioration}%`;
      explanation = `Visit interval has lengthened relative to baseline ${personalCadence ? `${personalCadence}d` : 'cadence'}. Encourage booking regular recurring sessions.`;
    } else {
      title = `Proactive retention check-in (score ${score ?? 40}/100)`;
      explanation = `Moderate retention risk detected across attendance and lifecycle factors. Review attendance log and suggest relevant instructor or class format.`;
    }
  } else if (status !== 'COMPLETE') {
    if (lifecycle === 'PAUSED') {
      title = 'Paused membership tracking';
      explanation = 'Member is currently on an active membership pause. Reconnect prior to planned resume date.';
    } else if (lifecycle === 'EXPIRED' || lifecycle === 'LAPSED') {
      title = 'Lapsed member reactivation';
      explanation = 'Membership ended without active renewal. Engage with reactivation offer or feedback inquiry.';
    } else {
      title = 'Evidence verification required';
      explanation = 'Assessment is limited or excluded due to unverified attendance coverage or non-active membership status.';
    }
  }

  return {
    action,
    priority,
    title,
    explanation,
    trigger,
    evidence,
  };
}

/**
 * Calls the Gemini API to generate personalized contextual recommendations
 * from raw retention metrics, falling back gracefully to deterministic dynamic synthesis.
 */
export async function generateRetentionRecommendation(
  assessment: RetentionAssessmentOutput,
  options?: { apiKey?: string; timeoutMs?: number },
): Promise<RetentionRecommendation> {
  const apiKey =
    options?.apiKey ??
    process.env.GEMINI_API_KEY?.trim() ??
    '';

  if (!apiKey) {
    return synthesizeDynamicRecommendation(assessment);
  }

  const score = assessment.score;
  const category = assessment.category;
  const lifecycle = assessment.lifecycle_state;
  const daysSinceAttendance = getIndicatorValue<number>(
    assessment,
    'days_since_attendance',
  );
  const declinePercent = getIndicatorValue<number>(
    assessment,
    'attendance_decline_percent',
  );
  const recentVisits = getIndicatorValue<number>(
    assessment,
    'recent_30_day_visits',
  );
  const previousVisits = getIndicatorValue<number>(
    assessment,
    'previous_30_day_visits',
  );
  const daysUntilExpiry = getIndicatorValue<number>(
    assessment,
    'days_until_expiry',
  );
  const confirmedRenewal = getIndicatorValue<boolean>(
    assessment,
    'confirmed_renewal',
  );
  const cadenceDeterioration = getIndicatorValue<number>(
    assessment,
    'cadence_deterioration_percent',
  );
  const nonRenewalRate = getIndicatorValue<number>(
    assessment,
    'non_renewal_rate_percent',
  );

  const prompt = `You are an expert retention analyst for boutique fitness and Pilates studios.
Based on the following member retention metrics, generate an actionable, contextual recommendation title and a 1-2 sentence explanation tailored specifically to this member's situation. Do not use generic copy. Be direct, professional, and practical for a studio owner.

Member Metrics:
- Retention Score: ${score !== null ? `${score}/100` : 'None'}
- Risk Category: ${category ?? 'N/A'}
- Lifecycle State: ${lifecycle}
- Days Since Last Attendance: ${daysSinceAttendance ?? 'Unknown'}
- Attendance in Last 30 Days: ${recentVisits ?? 'Unknown'} (vs previous 30 days: ${previousVisits ?? 'Unknown'})
- Attendance Decline: ${declinePercent !== null ? `${declinePercent}%` : 'N/A'}
- Days Until Membership Expiry: ${daysUntilExpiry ?? 'Unknown'}
- Confirmed Renewal: ${confirmedRenewal ? 'Yes' : 'No'}
- Cadence Deterioration: ${cadenceDeterioration !== null ? `${cadenceDeterioration}%` : 'N/A'}
- Historical Non-Renewal Rate: ${nonRenewalRate !== null ? `${nonRenewalRate}%` : 'N/A'}
- Baseline Action: ${assessment.recommendation.action}
- Identified Trigger: ${assessment.recommendation.trigger}

Respond strictly with valid JSON with two fields:
{
  "title": "<Concise, punchy, contextual title, max 8-10 words>",
  "explanation": "<1-2 sentence contextual explanation specifying the dynamic drivers and owner action>"
}`;

  try {
    const timeoutMs = options?.timeoutMs ?? 5_000;
    const response = await globalThis.fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(timeoutMs),
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.2,
          },
        }),
      },
    );

    if (!response.ok) {
      return synthesizeDynamicRecommendation(assessment);
    }

    const data = (await response.json()) as GeminiResponse;
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return synthesizeDynamicRecommendation(assessment);
    }

    const parsed = JSON.parse(text) as { title?: string; explanation?: string };
    if (!parsed.title || !parsed.explanation) {
      return synthesizeDynamicRecommendation(assessment);
    }

    return {
      action: assessment.recommendation.action,
      priority: assessment.recommendation.priority,
      title: parsed.title.trim(),
      explanation: parsed.explanation.trim(),
      trigger: assessment.recommendation.trigger,
      evidence: assessment.recommendation.evidence ?? [],
    };
  } catch {
    return synthesizeDynamicRecommendation(assessment);
  }
}

/**
 * Enriches a retention assessment with an LLM or dynamically synthesized recommendation.
 */
export async function enrichRetentionRecommendation(
  assessment: RetentionAssessmentOutput,
  options?: { apiKey?: string; timeoutMs?: number },
): Promise<RetentionAssessmentOutput> {
  const recommendation = await generateRetentionRecommendation(
    assessment,
    options,
  );
  return {
    ...assessment,
    recommendation,
  };
}
