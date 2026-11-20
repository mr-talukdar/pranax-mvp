import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { prisma } from '@pranax/database';
import { getDashboardSummary } from './services/dashboard';
import { createMember, getMemberById, listMembers } from './services/members';
import {
  createMembership,
  pauseMembership,
  resumeMembership,
  renewMembership,
  cancelMembership,
} from './services/memberships';
import {
  recordManualCheckIn,
  importAttendanceCsv,
} from './services/attendance';

const TARGET_STUDIO_ID = 'd9b73462-1111-4000-8000-000000000001';
const EXPECTED_OWNER_AUTH_ID = '52dd5e42-1f35-4889-bc25-6ac55cbb61c8';
const EVALUATION_DATE = '2026-11-20';

describe('PranaX End-to-End Integrated QA & Verification', () => {
  const credentialsPath = resolve(process.cwd(), '../../secrets/demo-credentials.json');
  const altCredentialsPath = resolve(process.cwd(), 'secrets/demo-credentials.json');
  const credPath = existsSync(credentialsPath) ? credentialsPath : altCredentialsPath;
  const credentials = JSON.parse(readFileSync(credPath, 'utf8'));

  const verifiedContext = {
    authUserId: EXPECTED_OWNER_AUTH_ID,
    studioId: TARGET_STUDIO_ID,
  };

  it('1. Authenticates demo owner and verifies StudioUser membership in Supabase', async () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    expect(supabaseUrl).toBeDefined();
    expect(publishableKey).toBeDefined();

    const supabase = createClient(supabaseUrl!, publishableKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    expect(authError).toBeNull();
    expect(authData.session).toBeDefined();
    expect(authData.user?.id).toBe(EXPECTED_OWNER_AUTH_ID);

    const studioUser = await prisma.studioUser.findFirst({
      where: {
        studioId: TARGET_STUDIO_ID,
        authUserId: authData.user!.id,
      },
    });
    expect(studioUser).toBeDefined();
    expect(studioUser?.role).toBe('OWNER');
  });

  it('2. Verifies baseline database record counts match synthetic v1.3.0 manifest', async () => {
    const [memberCount, attendanceCount, snapshotCount, studioCount, planCount, periodCount, pauseCount] =
      await Promise.all([
        prisma.member.count({ where: { studioId: TARGET_STUDIO_ID } }),
        prisma.attendanceRecord.count({ where: { studioId: TARGET_STUDIO_ID } }),
        prisma.retentionSnapshot.count({ where: { studioId: TARGET_STUDIO_ID } }),
        prisma.studio.count({ where: { id: TARGET_STUDIO_ID } }),
        prisma.membershipPlan.count({ where: { studioId: TARGET_STUDIO_ID } }),
        prisma.membershipPeriod.count({ where: { studioId: TARGET_STUDIO_ID } }),
        prisma.membershipPause.count({ where: { studioId: TARGET_STUDIO_ID } }),
      ]);

    expect(studioCount).toBe(1);
    expect(planCount).toBe(3);
    expect(memberCount).toBe(350);
    expect(attendanceCount).toBe(20882);
    expect(snapshotCount).toBe(234);
    expect(periodCount).toBe(1318);
    expect(pauseCount).toBe(22);
  });

  it('3. Fetches real Dashboard KPIs, attendance trends, and attention queue', async () => {
    const dashboard = await getDashboardSummary(verifiedContext, {
      asOfDate: EVALUATION_DATE,
    });

    expect(dashboard.totalMembers).toBe(350);
    expect(dashboard.activeMembers).toBe(234);

    const ret = dashboard.retentionSummary;
    expect(ret.lowCount + ret.mediumCount + ret.highCount).toBe(234);
    expect(ret.lowCount).toBe(155);
    expect(ret.mediumCount).toBe(39);
    expect(ret.highCount).toBe(40);

    expect(dashboard.attentionQueue.length).toBeGreaterThan(0);
    expect(dashboard.attentionQueue[0]?.primaryRecommendation).toBeDefined();
    expect(dashboard.attendanceTrends.length).toBeGreaterThanOrEqual(7);
  }, 45000);

  it('4. Executes full member lifecycle: create, retrieve, search, membership actions, check-in, and cleanup', async () => {
    const testEmail = `qa-e2e-${Date.now()}@example.invalid`;
    const testPhone = `+91987${Math.floor(1000000 + Math.random() * 9000000)}`;

    // Create
    const createdMember = await createMember(verifiedContext, {
      firstName: 'QA-Test-Disposable',
      lastName: 'User',
      email: testEmail,
      phone: testPhone,
    });
    expect(createdMember.id).toBeDefined();
    expect(createdMember.firstName).toBe('QA-Test-Disposable');
    const memberId = createdMember.id;
    let testBatchId: string | null = null;

    try {
      // Retrieve
      const retrieved = await getMemberById(verifiedContext, memberId);
      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe(memberId);
      expect(retrieved!.email).toBe(testEmail);

      // Search
      const searchRes = await listMembers(verifiedContext, { search: 'QA-Test-Disposable' });
      expect(searchRes.data.some((m) => m.id === memberId)).toBe(true);

      // Create membership using existing synthetic plan
      const existingPlan = await prisma.membershipPlan.findFirst({
        where: { studioId: TARGET_STUDIO_ID },
      });
      const period = await createMembership(verifiedContext, memberId, {
        planId: existingPlan!.id,
      });
      expect(period.status).toBe('ACTIVE');

      // Pause membership
      const pauseRes = await pauseMembership(verifiedContext, memberId, period.id, {});
      expect(pauseRes.period.status).toBe('PAUSED');
      expect(pauseRes.pause.id).toBeDefined();

      // Resume membership
      const resumeRes = await resumeMembership(verifiedContext, memberId, period.id, {});
      expect(resumeRes.period.status).toBe('ACTIVE');
      expect(resumeRes.pause.resumesAt).toBeDefined();

      // Renew membership
      const renewRes = await renewMembership(verifiedContext, memberId, period.id, {});
      expect(renewRes.status).toBe('ACTIVE');
      expect(renewRes.renewedFromId).toBe(period.id);

      // Cancel membership
      const cancelRes = await cancelMembership(verifiedContext, memberId, renewRes.id, {});
      expect(cancelRes.status).toBe('CANCELLED');

      // Attendance Check-in
      const checkIn = await recordManualCheckIn(verifiedContext, { memberId });
      expect(checkIn.id).toBeDefined();
      expect(checkIn.memberId).toBe(memberId);

      const dbCheckIn = await prisma.attendanceRecord.findUnique({ where: { id: checkIn.id } });
      expect(dbCheckIn).toBeDefined();

      // CSV Import (use distinct local date from manual check-in to avoid daily duplicate suppression)
      const csvContent = `member_id,occurred_at,check_in_type,notes\n${memberId},2026-11-19T10:00:00+05:30,REGULAR,E2E CSV Test`;
      const importRes = await importAttendanceCsv(verifiedContext, {
        csvContent,
        sourceName: 'e2e-test.csv',
      });
      testBatchId = importRes.batchId;
      expect(importRes.batchId).toBeDefined();
      expect(importRes.importedRows).toBe(1);
      expect(importRes.rejectedRows).toBe(0);
    } finally {
      if (testBatchId) {
        await prisma.attendanceRecord.deleteMany({ where: { batchId: testBatchId } });
        await prisma.attendanceImportBatch.deleteMany({ where: { id: testBatchId } });
      }

      // Clean up disposable member and all related records atomically in a transaction
      await prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe('ALTER TABLE "RetentionSnapshot" DISABLE TRIGGER "RetentionSnapshot_immutable";');
        await tx.$executeRawUnsafe(`DELETE FROM "RetentionSnapshot" WHERE "memberId" = '${memberId}'::uuid;`);
        await tx.$executeRawUnsafe('ALTER TABLE "RetentionSnapshot" ENABLE TRIGGER "RetentionSnapshot_immutable";');
        await tx.attendanceRecord.deleteMany({ where: { memberId } });
        await tx.membershipPause.deleteMany({ where: { period: { memberId } } });
        await tx.membershipPeriod.deleteMany({ where: { memberId } });
        await tx.member.deleteMany({ where: { id: memberId } });
      });
    }
  }, 90000);

  it('5. Enforces tenant isolation: rejects queries and mutations with mismatched studio IDs', async () => {
    const foreignStudioId = 'd9b73462-2222-4000-8000-000000000002';
    const unauthorizedContext = {
      authUserId: EXPECTED_OWNER_AUTH_ID,
      studioId: foreignStudioId,
    };

    await expect(
      getDashboardSummary(unauthorizedContext, { asOfDate: EVALUATION_DATE }),
    ).rejects.toThrow();

    await expect(
      listMembers(unauthorizedContext, {}),
    ).rejects.toThrow();

    await expect(
      createMember(unauthorizedContext, { firstName: 'Hacker', lastName: 'Tenant' }),
    ).rejects.toThrow();
  }, 30000);

  it('6. Confirms database state is completely intact with zero synthetic data drift', async () => {
    const [finalMembers, finalAttendance, finalSnapshots] = await Promise.all([
      prisma.member.count({ where: { studioId: TARGET_STUDIO_ID } }),
      prisma.attendanceRecord.count({ where: { studioId: TARGET_STUDIO_ID } }),
      prisma.retentionSnapshot.count({ where: { studioId: TARGET_STUDIO_ID } }),
    ]);

    expect(finalMembers).toBe(350);
    expect(finalAttendance).toBe(20882);
    expect(finalSnapshots).toBe(234);
  });
});
