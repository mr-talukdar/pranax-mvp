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
  const counts = await prisma.$transaction(async (tx) => {
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
    const existingStudio = await tx.studio.findUnique({
      where: { id: parsed.manifest.syntheticStudioId },
      select: { id: true },
    });
    if (existingStudio) {
      report.skipped += 1;
    } else {
      await tx.studio.create({ data: studio as never });
      report.inserted += 1;
    }

    const inserted = {
      studios: 1,
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

    for (const settings of parsed.studioSettings) {
      const data = withDates(settings, [
        'attendanceCoverageFrom',
        'coverageVerifiedAt',
      ]);
      const existing = await tx.studioSettings.findUnique({
        where: { id: settings.id as string },
      });
      if (existing) report.skipped += 1;
      else {
        await tx.studioSettings.create({ data: data as never });
        report.inserted += 1;
        inserted.studioSettings += 1;
      }
    }
    for (const member of parsed.members) {
      const data = withDates(member, ['joinedAt', 'createdAt', 'updatedAt']);
      const existing = await tx.member.findUnique({
        where: { id: member.id as string },
      });
      if (existing) report.skipped += 1;
      else {
        await tx.member.create({ data: data as never });
        report.inserted += 1;
        inserted.members += 1;
      }
    }
    for (const plan of parsed.membershipPlans) {
      const existing = await tx.membershipPlan.findUnique({
        where: { id: plan.id as string },
      });
      if (existing) report.skipped += 1;
      else {
        await tx.membershipPlan.create({ data: plan as never });
        report.inserted += 1;
        inserted.membershipPlans += 1;
      }
    }
    for (const period of parsed.membershipPeriods) {
      const data = withDates(period, [
        'startsAt',
        'originalEndsAt',
        'effectiveEndsAt',
        'cancelledAt',
      ]);
      const existing = await tx.membershipPeriod.findUnique({
        where: { id: period.id as string },
      });
      if (existing) report.skipped += 1;
      else {
        await tx.membershipPeriod.create({ data: data as never });
        report.inserted += 1;
        inserted.membershipPeriods += 1;
      }
    }
    for (const pause of parsed.membershipPauses) {
      const data = withDates(pause, ['startsAt', 'resumesAt']);
      const existing = await tx.membershipPause.findUnique({
        where: { id: pause.id as string },
      });
      if (existing) report.skipped += 1;
      else {
        await tx.membershipPause.create({ data: data as never });
        report.inserted += 1;
        inserted.membershipPauses += 1;
      }
    }
    for (const batch of parsed.attendanceImportBatches) {
      const data = withDates(batch, ['importedAt']);
      const existing = await tx.attendanceImportBatch.findUnique({
        where: { id: batch.id as string },
      });
      if (existing) report.skipped += 1;
      else {
        await tx.attendanceImportBatch.create({ data: data as never });
        report.inserted += 1;
        inserted.attendanceImportBatches += 1;
      }
    }
    for (const record of parsed.attendanceRecords) {
      const data = withDates(record, ['occurredAt', 'localDate']);
      const existing = await tx.attendanceRecord.findUnique({
        where: { id: record.id as string },
      });
      if (existing) report.skipped += 1;
      else {
        await tx.attendanceRecord.create({ data: data as never });
        report.inserted += 1;
        inserted.attendanceRecords += 1;
      }
    }
    for (const snapshot of parsed.retentionSnapshots) {
      const data = withDates(snapshot, ['snapshotDate']);
      const existing = await tx.retentionSnapshot.findUnique({
        where: { id: snapshot.id as string },
      });
      if (existing) {
        report.skipped += 1;
      } else {
        await tx.retentionSnapshot.create({ data: data as never });
        report.inserted += 1;
        inserted.retentionSnapshots += 1;
      }
    }
    for (const prediction of parsed.churnPredictions) {
      const data = withDates(prediction, [
        'predictionDate',
        'featureSnapshotAt',
      ]);
      const existing = await tx.churnPrediction.findUnique({
        where: { id: prediction.id as string },
      });
      if (existing) report.skipped += 1;
      else {
        await tx.churnPrediction.create({ data: data as never });
        report.inserted += 1;
        inserted.churnPredictions += 1;
      }
    }
    return inserted;
  });

  console.log(JSON.stringify({ datasetPath, counts, report }, null, 2));
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
