import { prisma } from '@pranax/database';
import { getDashboardSummary } from '../src/server/services/dashboard';

const TARGET_STUDIO_ID = 'd9b73462-1111-4000-8000-000000000001';
const AUTH_OWNER_USER_ID = '52dd5e42-1f35-4889-bc25-6ac55cbb61c8';
const EVALUATION_DATE = '2026-11-20';

const context = {
  authUserId: AUTH_OWNER_USER_ID,
  studioId: TARGET_STUDIO_ID,
};

async function main() {
  console.log('--- Verifying Database Snapshots ---');
  const count = await prisma.retentionSnapshot.count({
    where: { studioId: TARGET_STUDIO_ID },
  });
  const lowCount = await prisma.retentionSnapshot.count({
    where: { studioId: TARGET_STUDIO_ID, category: 'LOW' },
  });
  const medCount = await prisma.retentionSnapshot.count({
    where: { studioId: TARGET_STUDIO_ID, category: 'MEDIUM' },
  });
  const highCount = await prisma.retentionSnapshot.count({
    where: { studioId: TARGET_STUDIO_ID, category: 'HIGH' },
  });

  console.log(`Total Snapshots: ${count}`);
  console.log(`LOW: ${lowCount} (${Math.round((lowCount / count) * 100)}%)`);
  console.log(`MEDIUM: ${medCount} (${Math.round((medCount / count) * 100)}%)`);
  console.log(`HIGH: ${highCount} (${Math.round((highCount / count) * 100)}%)`);

  console.log('\n--- Calling getDashboardSummary ---');
  const summary = await getDashboardSummary(context, {
    asOfDate: EVALUATION_DATE,
  });

  console.log('Active Members:', summary.activeMembers);
  console.log('Total Members:', summary.totalMembers);
  console.log('Retention Summary in Dashboard:');
  console.log(JSON.stringify(summary.retentionSummary, null, 2));

  console.log(`\nAttention Queue Items: ${summary.attentionQueue.length}`);
  console.log('\nFirst 5 Attention Queue Items:');
  for (const item of summary.attentionQueue.slice(0, 5)) {
    console.log(`[${item.category}] ${item.memberName} (${item.planName}) - Score: ${item.score}`);
    console.log(`  Days Absent: ${item.daysAbsent} | Cadence: ${item.cadenceDrop}`);
    console.log(`  Recommendation: "${item.primaryRecommendation}"`);
    console.log(`  Key Factors:`, item.keyFactors);
    console.log('');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
