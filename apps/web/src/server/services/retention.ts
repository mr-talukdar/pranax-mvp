import 'server-only';

import { withVerifiedStudioContext } from '@pranax/database';
import type {
  RetentionAssessmentInput,
  RetentionAssessmentOutput,
} from '@pranax/contracts';
import type { StudioContext } from '../auth/context';
import { assessRetention } from './intelligence';

function localDate(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}

function databaseDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Loads evidence in verified tenant scope and delegates calculation to FastAPI. */
export async function assessMemberRetention(
  context: StudioContext,
  memberId: string,
): Promise<RetentionAssessmentOutput | null> {
  const evidence = await withVerifiedStudioContext(
    context.authUserId,
    context.studioId,
    async (tx) => {
      return tx.member.findFirst({
        where: { id: memberId, studioId: context.studioId },
        select: {
          id: true,
          attendanceRecords: {
            select: { occurredAt: true, createdAt: true, localDate: true },
          },
          membershipPeriods: {
            select: {
              id: true,
              startsAt: true,
              originalEndsAt: true,
              effectiveEndsAt: true,
              status: true,
              renewedFromId: true,
              createdAt: true,
              cancelledAt: true,
              pauses: {
                select: {
                  id: true,
                  startsAt: true,
                  resumesAt: true,
                  createdAt: true,
                },
              },
            },
          },
          studio: {
            select: {
              timezone: true,
              settings: {
                select: {
                  attendanceCoverageFrom: true,
                  coverageVerifiedAt: true,
                },
              },
            },
          },
        },
      });
    },
  );
  if (!evidence) return null;

  const now = new Date();
  const assessmentDate = localDate(now, evidence.studio.timezone);
  const coverageStart = evidence.studio.settings?.attendanceCoverageFrom;
  const coverageVerifiedAt = evidence.studio.settings?.coverageVerifiedAt;
  const verifiedThrough = coverageVerifiedAt
    ? localDate(coverageVerifiedAt, evidence.studio.timezone)
    : null;
  const payload: Omit<RetentionAssessmentInput, 'studio_id'> = {
    member_id: evidence.id,
    timezone: evidence.studio.timezone,
    assessment_date: assessmentDate,
    attendance_coverage: {
      start_date: coverageStart ? databaseDate(coverageStart) : null,
      end_date: verifiedThrough,
      verified_at: coverageVerifiedAt?.toISOString() ?? null,
      complete: Boolean(coverageStart && coverageVerifiedAt),
      gaps: [],
    },
    membership_history_complete: true,
    attendance: evidence.attendanceRecords
      .filter((record) => databaseDate(record.localDate) <= assessmentDate)
      .map((record) => ({
        occurred_at: record.occurredAt.toISOString(),
        recorded_at: record.createdAt.toISOString(),
        local_date: databaseDate(record.localDate),
      })),
    membership_periods: evidence.membershipPeriods.map((period) => ({
      id: period.id,
      starts_at: databaseDate(period.startsAt),
      original_ends_at: databaseDate(period.originalEndsAt),
      effective_ends_at: databaseDate(period.effectiveEndsAt),
      status: period.status,
      renewed_from_id: period.renewedFromId,
      recorded_at: period.createdAt.toISOString(),
      cancelled_at: period.cancelledAt?.toISOString() ?? null,
    })),
    membership_pauses: evidence.membershipPeriods.flatMap((period) =>
      period.pauses.map((pause) => ({
        id: pause.id,
        period_id: period.id,
        starts_at: databaseDate(pause.startsAt),
        resumes_at: pause.resumesAt ? databaseDate(pause.resumesAt) : null,
        recorded_at: pause.createdAt.toISOString(),
      })),
    ),
  };
  return assessRetention(context, payload);
}
