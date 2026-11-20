import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { z } from 'zod';
import { prisma } from './client.js';

const datasetSchema = z.object({
  manifest: z.object({
    datasetVersion: z.string(),
    generatorVersion: z.string(),
    schemaVersion: z.literal('prisma-foundation-v2'),
    syntheticStudioId: z.string().uuid(),
    seed: z.number().int().nonnegative(),
    scenarioIds: z.array(z.string()).min(1),
    generatedAt: z.string(),
    syntheticIntelligence: z
      .object({
        retentionSnapshotsIncluded: z.literal(false),
        churnPredictionsIncluded: z.literal(false),
      })
      .optional(),
  }),
  studios: z.array(z.record(z.string(), z.unknown())),
  studioSettings: z.array(z.record(z.string(), z.unknown())),
  members: z.array(z.record(z.string(), z.unknown())),
  membershipPlans: z.array(z.record(z.string(), z.unknown())),
  membershipPeriods: z.array(z.record(z.string(), z.unknown())),
  membershipPauses: z.array(z.record(z.string(), z.unknown())),
  attendanceImportBatches: z.array(z.record(z.string(), z.unknown())),
  attendanceRecords: z.array(z.record(z.string(), z.unknown())),
  retentionSnapshots: z.array(z.record(z.string(), z.unknown())),
  churnPredictions: z.array(z.record(z.string(), z.unknown())),
});

const datasetPath = process.argv[2] ?? resolve('datasets/latest/dataset.json');
const resetSynthetic = process.argv.includes('--reset-synthetic');
const CHUNK_SIZE = 1000;

function assertSyntheticOnly(
  studios: Array<Record<string, unknown>>,
  expectedId: string,
): void {
  if (
    studios.length !== 1 ||
    studios[0]?.id !== expectedId ||
    studios[0]?.isSynthetic !== true
  ) {
    throw new Error(
      'Seed dataset must contain exactly one explicitly synthetic studio.',
    );
  }
}

function assertTenantRecords(
  records: Array<Record<string, unknown>>,
  expectedStudioId: string,
  collection: string,
): void {
  for (const record of records) {
    if (record.studioId !== expectedStudioId) {
      throw new Error(
        `${collection} contains a record outside the synthetic studio.`,
      );
    }
    if (typeof record.id !== 'string') {
      throw new Error(`${collection} contains a record without a stable id.`);
    }
  }
}

function dateValue(value: unknown): Date | undefined {
  return typeof value === 'string' ? new Date(value) : undefined;
}

function withDates(
  record: Record<string, unknown>,
  fields: string[],
): Record<string, unknown> {
  const result = { ...record };
  for (const field of fields) {
    const converted = dateValue(result[field]);
    if (converted) result[field] = converted;
  }
  return result;
}

async function batchInsert<T extends Record<string, unknown>>(
  records: T[],
  chunkSize: number,
  insertChunk: (chunk: T[]) => Promise<{ count: number }>,
): Promise<{ inserted: number; skipped: number }> {
  let inserted = 0;
  let skipped = 0;
  for (let i = 0; i < records.length; i += chunkSize) {
    const chunk = records.slice(i, i + chunkSize);
    const result = await insertChunk(chunk);
    inserted += result.count;
    skipped += chunk.length - result.count;
  }
  return { inserted, skipped };
}

async function main(): Promise<void> {
  const parsed = datasetSchema.parse(
    JSON.parse(await readFile(datasetPath, 'utf8')),
  );
  assertSyntheticOnly(parsed.studios, parsed.manifest.syntheticStudioId);
  for (const prediction of parsed.churnPredictions) {
    const snapshot = prediction.featureSnapshot;
    if (
      typeof snapshot !== 'object' ||
      snapshot === null ||
      typeof (snapshot as Record<string, unknown>).asOf !== 'string'
    ) {
      throw new Error(
        `Churn prediction ${prediction.id as string} is missing featureSnapshot.asOf provenance.`,
      );
    }
    prediction.featureSnapshotAt = (snapshot as Record<string, unknown>).asOf;
    prediction.featureSchemaVersion = parsed.manifest.schemaVersion;
  }
  for (const [collection, records] of Object.entries(parsed).filter(
    ([key, value]) =>
      key !== 'manifest' && key !== 'studios' && Array.isArray(value),
  )) {
    assertTenantRecords(
      records as Array<Record<string, unknown>>,
      parsed.manifest.syntheticStudioId,
      collection,
    );
  }

  const report = {
    inserted: 0,
    updated: 0,
    skipped: 0,
    rejected: 0,
  };
  const counts = await prisma.$transaction(
    async (tx) => {
      const studio = parsed.studios[0];
      if (resetSynthetic) {
        const existing = await tx.studio.findUnique({
          where: { id: parsed.manifest.syntheticStudioId },
          select: { isSynthetic: true },
        });
        if (existing && !existing.isSynthetic) {
          throw new Error('Refusing to reset a non-synthetic studio.');
        }
        if (existing) {
          throw new Error(
            'Synthetic reset is disabled because historical snapshots are immutable.',
          );
        }
      }

      const inserted = {
        studios: 0,
        studioSettings: 0,
        members: 0,
        membershipPlans: 0,
        membershipPeriods: 0,
        membershipPauses: 0,
        attendanceImportBatches: 0,
        attendanceRecords: 0,
        retentionSnapshots: 0,
        churnPredictions: 0,
      };

      const existingStudio = await tx.studio.findUnique({
        where: { id: parsed.manifest.syntheticStudioId },
        select: { id: true },
      });
      if (existingStudio) {
        report.skipped += 1;
      } else {
        await tx.studio.create({ data: studio as never });
        report.inserted += 1;
        inserted.studios += 1;
      }

      const preparedStudioSettings = parsed.studioSettings.map((s) =>
        withDates(s, ['attendanceCoverageFrom', 'coverageVerifiedAt']),
      );
      const studioSettingsResult = await batchInsert(
        preparedStudioSettings,
        CHUNK_SIZE,
        (chunk) =>
          tx.studioSettings.createMany({
            data: chunk as never,
            skipDuplicates: true,
          }),
      );
      report.inserted += studioSettingsResult.inserted;
      report.skipped += studioSettingsResult.skipped;
      inserted.studioSettings += studioSettingsResult.inserted;

      const preparedMembers = parsed.members.map((m) =>
        withDates(m, ['joinedAt', 'createdAt', 'updatedAt']),
      );
      const membersResult = await batchInsert(
        preparedMembers,
        CHUNK_SIZE,
        (chunk) =>
          tx.member.createMany({
            data: chunk as never,
            skipDuplicates: true,
          }),
      );
      report.inserted += membersResult.inserted;
      report.skipped += membersResult.skipped;
      inserted.members += membersResult.inserted;

      const plansResult = await batchInsert(
        parsed.membershipPlans,
        CHUNK_SIZE,
        (chunk) =>
          tx.membershipPlan.createMany({
            data: chunk as never,
            skipDuplicates: true,
          }),
      );
      report.inserted += plansResult.inserted;
      report.skipped += plansResult.skipped;
      inserted.membershipPlans += plansResult.inserted;

      const preparedPeriods = parsed.membershipPeriods.map((p) =>
        withDates(p, [
          'startsAt',
          'originalEndsAt',
          'effectiveEndsAt',
          'cancelledAt',
        ]),
      );
      const periodsResult = await batchInsert(
        preparedPeriods,
        CHUNK_SIZE,
        (chunk) =>
          tx.membershipPeriod.createMany({
            data: chunk as never,
            skipDuplicates: true,
          }),
      );
      report.inserted += periodsResult.inserted;
      report.skipped += periodsResult.skipped;
      inserted.membershipPeriods += periodsResult.inserted;

      const preparedPauses = parsed.membershipPauses.map((p) =>
        withDates(p, ['startsAt', 'resumesAt']),
      );
      const pausesResult = await batchInsert(
        preparedPauses,
        CHUNK_SIZE,
        (chunk) =>
          tx.membershipPause.createMany({
            data: chunk as never,
            skipDuplicates: true,
          }),
      );
      report.inserted += pausesResult.inserted;
      report.skipped += pausesResult.skipped;
      inserted.membershipPauses += pausesResult.inserted;

      const preparedBatches = parsed.attendanceImportBatches.map((b) =>
        withDates(b, ['importedAt']),
      );
      const batchesResult = await batchInsert(
        preparedBatches,
        CHUNK_SIZE,
        (chunk) =>
          tx.attendanceImportBatch.createMany({
            data: chunk as never,
            skipDuplicates: true,
          }),
      );
      report.inserted += batchesResult.inserted;
      report.skipped += batchesResult.skipped;
      inserted.attendanceImportBatches += batchesResult.inserted;

      const preparedRecords = parsed.attendanceRecords.map((r) =>
        withDates(r, ['occurredAt', 'localDate']),
      );
      const recordsResult = await batchInsert(
        preparedRecords,
        CHUNK_SIZE,
        (chunk) =>
          tx.attendanceRecord.createMany({
            data: chunk as never,
            skipDuplicates: true,
          }),
      );
      report.inserted += recordsResult.inserted;
      report.skipped += recordsResult.skipped;
      inserted.attendanceRecords += recordsResult.inserted;

      const preparedSnapshots = parsed.retentionSnapshots.map((s) =>
        withDates(s, ['snapshotDate']),
      );
      const snapshotsResult = await batchInsert(
        preparedSnapshots,
        CHUNK_SIZE,
        (chunk) =>
          tx.retentionSnapshot.createMany({
            data: chunk as never,
            skipDuplicates: true,
          }),
      );
      report.inserted += snapshotsResult.inserted;
      report.skipped += snapshotsResult.skipped;
      inserted.retentionSnapshots += snapshotsResult.inserted;

      const preparedPredictions = parsed.churnPredictions.map((p) =>
        withDates(p, ['predictionDate', 'featureSnapshotAt']),
      );
      const predictionsResult = await batchInsert(
        preparedPredictions,
        CHUNK_SIZE,
        (chunk) =>
          tx.churnPrediction.createMany({
            data: chunk as never,
            skipDuplicates: true,
          }),
      );
      report.inserted += predictionsResult.inserted;
      report.skipped += predictionsResult.skipped;
      inserted.churnPredictions += predictionsResult.inserted;

      return inserted;
    },
    { maxWait: 30000, timeout: 180000 },
  );

  console.log(JSON.stringify({ datasetPath, counts, report }, null, 2));
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
