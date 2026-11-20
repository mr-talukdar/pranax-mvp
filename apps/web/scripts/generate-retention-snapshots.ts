import { prisma } from '@pranax/database';
import {
  assessMemberRetention,
  persistRetentionAssessment,
} from '../src/server/services/retention';
import { getDashboardSummary } from '../src/server/services/dashboard';

const TARGET_STUDIO_ID = 'd9b73462-1111-4000-8000-000000000001';
const AUTH_OWNER_USER_ID = '52dd5e42-1f35-4889-bc25-6ac55cbb61c8';
const EVALUATION_DATE = '2026-11-20';

const context = {
  authUserId: AUTH_OWNER_USER_ID,
  studioId: TARGET_STUDIO_ID,
};

async function main() {
  console.log('================================================================');
  console.log('PranaX Retention Snapshot Generation & Persistence Pipeline');
  console.log(`Target Studio: ${TARGET_STUDIO_ID}`);
  console.log(`Evaluation Date: ${EVALUATION_DATE}`);
  console.log(`Owner Auth ID: ${AUTH_OWNER_USER_ID}`);
  console.log('================================================================\n');

  // Verify studio existence and settings
  const studio = await prisma.studio.findUnique({
    where: { id: TARGET_STUDIO_ID },
    include: {
      settings: true,
      _count: { select: { members: true, retentionSnapshots: true } },
    },
  });

  if (!studio) {
    throw new Error(`Studio ${TARGET_STUDIO_ID} not found in database.`);
  }

  console.log(`Studio Name: ${studio.name}`);
  console.log(`Timezone: ${studio.timezone}`);
  console.log(`Total Members: ${studio._count.members}`);
  console.log(`Existing Retention Snapshots: ${studio._count.retentionSnapshots}`);
  console.log(`Attendance Coverage From: ${studio.settings?.attendanceCoverageFrom?.toISOString().slice(0, 10)}`);
  console.log(`Coverage Verified At: ${studio.settings?.coverageVerifiedAt?.toISOString()}`);
  console.log('----------------------------------------------------------------\n');

  // Fetch all 350 members
  const members = await prisma.member.findMany({
    where: { studioId: TARGET_STUDIO_ID },
    select: { id: true, firstName: true, lastName: true },
    orderBy: { id: 'asc' },
  });

  console.log(`Loaded ${members.length} members. Starting retention assessment...\n`);

  const stats = {
    total: members.length,
    complete: 0,
    limited: 0,
    excluded: 0,
    persisted: 0,
    equivalentExists: 0,
    noSignificantChange: 0,
    notEligible: 0,
    errors: 0,
    riskDistribution: {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
    },
    sampleRecommendations: [] as Array<{
      memberId: string;
      name: string;
      score: number | null;
      category: string | null;
      title: string;
      explanation: string;
      action: string;
      trigger: string;
    }>,
  };

  // Process members with controlled concurrency
  const CONCURRENCY = 8;
  const chunks: typeof members[] = [];
  for (let i = 0; i < members.length; i += CONCURRENCY) {
    chunks.push(members.slice(i, i + CONCURRENCY));
  }

  let processedCount = 0;

  for (const chunk of chunks) {
    await Promise.all(
      chunk.map(async (member) => {
        try {
          const assessment = await assessMemberRetention(
            context,
            member.id,
            EVALUATION_DATE,
          );

          if (!assessment) {
            console.error(`Member ${member.id} returned null assessment.`);
            stats.errors++;
            return;
          }

          if (assessment.status === 'COMPLETE') {
            stats.complete++;
            if (assessment.category) {
              stats.riskDistribution[assessment.category]++;
            }

            const persistence = await persistRetentionAssessment(
              context,
              assessment,
            );

            if (persistence.outcome === 'PERSISTED') {
              stats.persisted++;
            } else if (persistence.outcome === 'EQUIVALENT_EXISTS') {
              stats.equivalentExists++;
            } else if (persistence.outcome === 'NO_SIGNIFICANT_CHANGE') {
              stats.noSignificantChange++;
            } else {
              stats.notEligible++;
            }

            // Collect samples across categories
            if (
              stats.sampleRecommendations.length < 15 &&
              (stats.sampleRecommendations.filter(
                (s) => s.category === assessment.category,
              ).length < 5)
            ) {
              stats.sampleRecommendations.push({
                memberId: member.id,
                name: `${member.firstName} ${member.lastName}`,
                score: assessment.score,
                category: assessment.category,
                title: assessment.recommendation.title,
                explanation: assessment.recommendation.explanation,
                action: assessment.recommendation.action,
                trigger: assessment.recommendation.trigger,
              });
            }
          } else if (assessment.status === 'LIMITED') {
            stats.limited++;
          } else {
            stats.excluded++;
          }
        } catch (error) {
          stats.errors++;
          console.error(
            `Error assessing member ${member.id}:`,
            error instanceof Error ? error.message : error,
          );
        } finally {
          processedCount++;
          if (processedCount % 50 === 0 || processedCount === members.length) {
            console.log(
              `Processed ${processedCount}/${members.length} members (Complete: ${stats.complete}, Limited: ${stats.limited}, Excluded: ${stats.excluded}, Persisted: ${stats.persisted})`,
            );
          }
        }
      }),
    );
  }

  console.log('\n================================================================');
  console.log('Assessment & Persistence Pipeline Complete');
  console.log('================================================================');
  console.log(`Total Members Processed: ${stats.total}`);
  console.log(`Complete (Eligible):     ${stats.complete}`);
  console.log(`Limited:                 ${stats.limited}`);
  console.log(`Excluded:                ${stats.excluded}`);
  console.log(`Persisted Snapshots:     ${stats.persisted}`);
  console.log(`Equivalent Exists:       ${stats.equivalentExists}`);
  console.log(`No Significant Change:   ${stats.noSignificantChange}`);
  console.log(`Not Eligible:            ${stats.notEligible}`);
  console.log(`Errors:                  ${stats.errors}`);
  console.log('\nRisk Distribution (from complete assessments):');
  console.log(`  LOW:    ${stats.riskDistribution.LOW} (${Math.round((stats.riskDistribution.LOW / stats.complete) * 100)}%)`);
  console.log(`  MEDIUM: ${stats.riskDistribution.MEDIUM} (${Math.round((stats.riskDistribution.MEDIUM / stats.complete) * 100)}%)`);
  console.log(`  HIGH:   ${stats.riskDistribution.HIGH} (${Math.round((stats.riskDistribution.HIGH / stats.complete) * 100)}%)`);

  // Verify from Remote Supabase Database Directly
  console.log('\n----------------------------------------------------------------');
  console.log('Direct Database Verification:');
  const dbSnapshotsCount = await prisma.retentionSnapshot.count({
    where: { studioId: TARGET_STUDIO_ID },
  });
  const dbLowCount = await prisma.retentionSnapshot.count({
    where: { studioId: TARGET_STUDIO_ID, category: 'LOW' },
  });
  const dbMediumCount = await prisma.retentionSnapshot.count({
    where: { studioId: TARGET_STUDIO_ID, category: 'MEDIUM' },
  });
  const dbHighCount = await prisma.retentionSnapshot.count({
    where: { studioId: TARGET_STUDIO_ID, category: 'HIGH' },
  });

  console.log(`Total Retention Snapshots in DB: ${dbSnapshotsCount}`);
  console.log(`  DB LOW:    ${dbLowCount}`);
  console.log(`  DB MEDIUM: ${dbMediumCount}`);
  console.log(`  DB HIGH:   ${dbHighCount}`);

  // Sample persisted snapshot record
  const sampleSnapshot = await prisma.retentionSnapshot.findFirst({
    where: { studioId: TARGET_STUDIO_ID, category: 'HIGH' },
    include: { member: { select: { firstName: true, lastName: true } } },
  });

  if (sampleSnapshot) {
    console.log('\nSample HIGH Risk Snapshot from Database:');
    console.log(`  Member: ${sampleSnapshot.member.firstName} ${sampleSnapshot.member.lastName} (${sampleSnapshot.memberId})`);
    console.log(`  Score: ${sampleSnapshot.score} | Category: ${sampleSnapshot.category}`);
    console.log(`  Snapshot Type: ${sampleSnapshot.snapshotType} | Date: ${sampleSnapshot.snapshotDate.toISOString().slice(0, 10)}`);
    console.log(`  Recommendation Title: ${sampleSnapshot.recommendation}`);
    console.log(`  Fingerprint: ${sampleSnapshot.assessmentFingerprint}`);
    console.log('  Metadata Recommendation:', JSON.stringify((sampleSnapshot.assessmentMetadata as Record<string, unknown>)?.recommendation, null, 2));
  }

  // Dashboard Summary Verification
  console.log('\n----------------------------------------------------------------');
  console.log('Verifying getDashboardSummary...');
  const dashboard = await getDashboardSummary(context, {
    asOfDate: EVALUATION_DATE,
  });

  console.log('Dashboard Retention Summary:');
  console.log(JSON.stringify(dashboard.retentionSummary, null, 2));
  console.log(`Attention Queue Count: ${dashboard.attentionQueue.length}`);
  if (dashboard.attentionQueue.length > 0) {
    console.log('Sample Attention Queue Item:');
    console.log(JSON.stringify(dashboard.attentionQueue[0], null, 2));
  }

  console.log('\nSample Generated Recommendations:');
  for (const s of stats.sampleRecommendations.slice(0, 8)) {
    console.log(`[${s.category}] ${s.name} (Score ${s.score}):`);
    console.log(`  Title: "${s.title}"`);
    console.log(`  Explanation: "${s.explanation}"`);
    console.log(`  Action: ${s.action} | Trigger: ${s.trigger}\n`);
  }
}

main()
  .catch((e) => {
    console.error('Fatal execution error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
