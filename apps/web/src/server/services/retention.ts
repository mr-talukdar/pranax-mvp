import 'server-only';

import { createHash } from 'node:crypto';
import { withVerifiedStudioContext } from '@pranax/database';
import type { Prisma } from '@pranax/database';
import type {
  RetentionAssessmentInput,
  RetentionAssessmentOutput,
  RetentionHistoryResponse,
  RetentionSnapshotMetadata,
  RetentionSnapshotPersistence,
} from '@pranax/contracts';
import {
  retentionHistoryResponseSchema,
  retentionSnapshotMetadataSchema,
} from '@pranax/contracts';
import type { StudioContext } from '../auth/context';
import { assessRetention } from './intelligence';
import { enrichRetentionRecommendation } from './retentionRecommendation';

/** Provisional, code-configurable MVP threshold: a score shift of at least 10 points. */
export const RETENTION_SIGNIFICANT_SCORE_DELTA = 10;

type SnapshotMetadata = RetentionSnapshotMetadata;

function metadataFromJson(
  value: Prisma.JsonValue | null,
): SnapshotMetadata | null {
  if (value === null) return null;
  return retentionSnapshotMetadataSchema.parse(value);
}

function metadataFor(assessment: RetentionAssessmentOutput): SnapshotMetadata {
  return {
    assessed_at: assessment.assessed_at,
    status: assessment.status,
    lifecycle_state: assessment.lifecycle_state,
    lifecycle_events: assessment.lifecycle_events,
    recommendation: assessment.recommendation,
    completeness_reasons: assessment.completeness_reasons,
  };
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

function withoutAssessmentTimestamp<T extends { assessed_at: string }>(
  value: T,
): Omit<T, 'assessed_at'> {
  return Object.fromEntries(
    Object.entries(value).filter(([key]) => key !== 'assessed_at'),
  ) as Omit<T, 'assessed_at'>;
}

function fingerprintFor(assessment: RetentionAssessmentOutput): string {
  return createHash('sha256')
    .update(canonicalJson(withoutAssessmentTimestamp(assessment)))
    .digest('hex');
}

function sameAssessment(
  snapshot: {
    score: number;
    category: string;
    dimensionScores: Prisma.JsonValue;
    indicators: Prisma.JsonValue;
    recommendation: string | null;
    isComplete: boolean;
    scoringVersion: string;
    assessmentMetadata: Prisma.JsonValue | null;
  },
  assessment: RetentionAssessmentOutput,
): boolean {
  const storedMetadata = metadataFromJson(snapshot.assessmentMetadata);
  const storedResult = storedMetadata
    ? withoutAssessmentTimestamp(storedMetadata)
    : null;
  const newResult = withoutAssessmentTimestamp(metadataFor(assessment));
  const storedCore = {
    score: snapshot.score,
    category: snapshot.category,
    dimensions: snapshot.dimensionScores,
    indicators: snapshot.indicators,
    recommendationTitle: snapshot.recommendation,
    isComplete: snapshot.isComplete,
    scoringVersion: snapshot.scoringVersion,
  };
  const nextCore = {
    score: assessment.score,
    category: assessment.category,
    dimensions: assessment.dimensions,
    indicators: assessment.indicators,
    recommendationTitle: assessment.recommendation.title,
    isComplete: assessment.is_complete,
    scoringVersion: assessment.scoring_version,
  };
  return (
    canonicalJson(storedCore) === canonicalJson(nextCore) &&
    (!storedMetadata ||
      canonicalJson(storedResult) === canonicalJson(newResult))
  );
}

function isSignificantChange(
  previous: {
    score: number;
    category: string;
    isComplete: boolean;
    scoringVersion: string;
    assessmentMetadata: Prisma.JsonValue | null;
    recommendation: string | null;
  },
  next: RetentionAssessmentOutput,
): boolean {
  const previousMetadata = metadataFromJson(previous.assessmentMetadata);
  return (
    previous.category !== next.category ||
    (previousMetadata !== null &&
      previousMetadata.lifecycle_state !== next.lifecycle_state) ||
    previous.recommendation !== next.recommendation.title ||
    (previous.scoringVersion === next.scoring_version &&
      Math.abs(previous.score - (next.score ?? previous.score)) >=
        RETENTION_SIGNIFICANT_SCORE_DELTA) ||
    previous.isComplete !== next.is_complete
  );
}

function snapshotMetadataInput(
  assessment: RetentionAssessmentOutput,
): Prisma.InputJsonValue {
  return metadataFor(assessment) as Prisma.InputJsonValue;
}

/** Persists only complete risk assessments; insert conflicts are resolved by the database unique key. */
export async function persistRetentionAssessment(
  context: StudioContext,
  assessment: RetentionAssessmentOutput,
): Promise<RetentionSnapshotPersistence> {
  if (
    assessment.status !== 'COMPLETE' ||
    assessment.score === null ||
    assessment.category === null
  ) {
    return { outcome: 'NOT_ELIGIBLE', snapshot_id: null };
  }
  const score = assessment.score;
  const category = assessment.category;

  return withVerifiedStudioContext(
    context.authUserId,
    context.studioId,
    async (tx) => {
      const snapshotDate = new Date(
        `${assessment.assessment_date}T00:00:00.000Z`,
      );
      const assessmentFingerprint = fingerprintFor(assessment);
      const key = {
        studioId: context.studioId,
        memberId: assessment.member_id,
        snapshotDate,
        scoringVersion: assessment.scoring_version,
      };
      const dailyKey = {
        studioId: context.studioId,
        memberId: assessment.member_id,
        snapshotDate,
      };
      const equivalent = await tx.retentionSnapshot.findFirst({
        where: { ...key, assessmentFingerprint },
        select: { id: true },
      });
      if (equivalent) {
        return { outcome: 'EQUIVALENT_EXISTS', snapshot_id: equivalent.id };
      }
      const today = await tx.retentionSnapshot.findFirst({
        where: { ...dailyKey, snapshotType: 'DAILY' },
      });

      if (!today) {
        const inserted = await tx.retentionSnapshot.createMany({
          data: [
            {
              ...key,
              assessmentFingerprint,
              snapshotType: 'DAILY',
              score,
              category,
              dimensionScores: assessment.dimensions as Prisma.InputJsonValue,
              indicators: assessment.indicators as Prisma.InputJsonValue,
              recommendation: assessment.recommendation.title,
              isComplete: assessment.is_complete,
              assessmentMetadata: snapshotMetadataInput(assessment),
            },
          ],
          skipDuplicates: true,
        });
        const created = await tx.retentionSnapshot.findFirst({
          where: { ...dailyKey, snapshotType: 'DAILY' },
          select: {
            id: true,
            score: true,
            category: true,
            dimensionScores: true,
            indicators: true,
            recommendation: true,
            isComplete: true,
            scoringVersion: true,
            assessmentMetadata: true,
          },
        });
        if (!created)
          throw new Error('Retention snapshot insert was not visible.');
        if (inserted.count) {
          return { outcome: 'PERSISTED', snapshot_id: created.id };
        }
        if (sameAssessment(created, assessment)) {
          return { outcome: 'EQUIVALENT_EXISTS', snapshot_id: created.id };
        }
        const previous = await tx.retentionSnapshot.findFirst({
          where: {
            studioId: context.studioId,
            memberId: assessment.member_id,
            scoringVersion: assessment.scoring_version,
            snapshotDate: { lte: snapshotDate },
          },
          orderBy: [{ snapshotDate: 'desc' }, { createdAt: 'desc' }],
        });
        if (!previous || !isSignificantChange(previous, assessment)) {
          return { outcome: 'NO_SIGNIFICANT_CHANGE', snapshot_id: created.id };
        }
        const eventInsert = await tx.retentionSnapshot.createMany({
          data: [
            {
              ...key,
              assessmentFingerprint,
              snapshotType: 'SIGNIFICANT_EVENT',
              score,
              category,
              dimensionScores: assessment.dimensions as Prisma.InputJsonValue,
              indicators: assessment.indicators as Prisma.InputJsonValue,
              recommendation: assessment.recommendation.title,
              isComplete: assessment.is_complete,
              assessmentMetadata: snapshotMetadataInput(assessment),
            },
          ],
          skipDuplicates: true,
        });
        const event = await tx.retentionSnapshot.findFirst({
          where: {
            ...key,
            assessmentFingerprint,
            snapshotType: 'SIGNIFICANT_EVENT',
          },
          select: {
            id: true,
            score: true,
            category: true,
            dimensionScores: true,
            indicators: true,
            recommendation: true,
            isComplete: true,
            scoringVersion: true,
            assessmentMetadata: true,
          },
        });
        if (!event)
          throw new Error('Retention event snapshot insert was not visible.');
        return {
          outcome: eventInsert.count ? 'PERSISTED' : 'EQUIVALENT_EXISTS',
          snapshot_id: event.id,
        };
      }

      if (sameAssessment(today, assessment)) {
        return { outcome: 'EQUIVALENT_EXISTS', snapshot_id: today.id };
      }

      const previous = await tx.retentionSnapshot.findFirst({
        where: {
          studioId: context.studioId,
          memberId: assessment.member_id,
          scoringVersion: assessment.scoring_version,
          snapshotDate: { lte: snapshotDate },
        },
        orderBy: [{ snapshotDate: 'desc' }, { createdAt: 'desc' }],
      });
      if (!previous || !isSignificantChange(previous, assessment)) {
        return { outcome: 'NO_SIGNIFICANT_CHANGE', snapshot_id: today.id };
      }

      const inserted = await tx.retentionSnapshot.createMany({
        data: [
          {
            ...key,
            assessmentFingerprint,
            snapshotType: 'SIGNIFICANT_EVENT',
            score,
            category,
            dimensionScores: assessment.dimensions as Prisma.InputJsonValue,
            indicators: assessment.indicators as Prisma.InputJsonValue,
            recommendation: assessment.recommendation.title,
            isComplete: assessment.is_complete,
            assessmentMetadata: snapshotMetadataInput(assessment),
          },
        ],
        skipDuplicates: true,
      });
      const event = await tx.retentionSnapshot.findFirst({
        where: {
          ...key,
          assessmentFingerprint,
          snapshotType: 'SIGNIFICANT_EVENT',
        },
        select: {
          id: true,
          score: true,
          category: true,
          dimensionScores: true,
          indicators: true,
          recommendation: true,
          isComplete: true,
          scoringVersion: true,
          assessmentMetadata: true,
        },
      });
      if (!event)
        throw new Error('Retention event snapshot insert was not visible.');
      return {
        outcome: inserted.count ? 'PERSISTED' : 'EQUIVALENT_EXISTS',
        snapshot_id: event.id,
      };
    },
  );
}

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
  asOfDate?: string,
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
  const today = localDate(now, evidence.studio.timezone);
  const coverageStart = evidence.studio.settings?.attendanceCoverageFrom;
  const coverageVerifiedAt = evidence.studio.settings?.coverageVerifiedAt;
  const verifiedThrough = coverageVerifiedAt
    ? localDate(coverageVerifiedAt, evidence.studio.timezone)
    : null;
  // Assess only through the last date the studio has verified as complete.
  // This allows a valid, clearly dated score without treating unverified days
  // as zero attendance. Explicit historical requests remain unchanged.
  const assessmentDate =
    asOfDate ??
    (verifiedThrough && verifiedThrough < today ? verifiedThrough : today);
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
  const rawAssessment = await assessRetention(context, payload);
  return enrichRetentionRecommendation(rawAssessment);
}

/** Returns immutable member history in ascending assessment order and verified tenant scope. */
export async function getMemberRetentionHistory(
  context: StudioContext,
  memberId: string,
  limit: number,
  offset: number,
): Promise<RetentionHistoryResponse | null> {
  return withVerifiedStudioContext(
    context.authUserId,
    context.studioId,
    async (tx) => {
      const member = await tx.member.findFirst({
        where: { id: memberId, studioId: context.studioId },
        select: { id: true },
      });
      if (!member) return null;

      const rows = await tx.retentionSnapshot.findMany({
        where: { memberId, studioId: context.studioId },
        orderBy: [{ snapshotDate: 'asc' }, { createdAt: 'asc' }],
        skip: offset,
        take: limit + 1,
      });
      const hasMore = rows.length > limit;
      return retentionHistoryResponseSchema.parse({
        items: rows.slice(0, limit).map((row) => {
          const metadata = metadataFromJson(row.assessmentMetadata);
          return {
            id: row.id,
            assessment_date: databaseDate(row.snapshotDate),
            assessed_at: metadata?.assessed_at ?? null,
            snapshot_type: row.snapshotType,
            score: row.score,
            category: row.category as 'LOW' | 'MEDIUM' | 'HIGH',
            is_complete: row.isComplete,
            status: metadata?.status ?? null,
            lifecycle_state: metadata?.lifecycle_state ?? null,
            dimensions:
              row.dimensionScores as RetentionAssessmentOutput['dimensions'],
            indicators:
              row.indicators as RetentionAssessmentOutput['indicators'],
            recommendation: metadata?.recommendation ?? null,
            scoring_version: row.scoringVersion,
          };
        }),
        pagination: { limit, offset, has_more: hasMore },
      });
    },
  );
}
