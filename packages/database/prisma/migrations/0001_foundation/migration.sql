-- CreateEnum
CREATE TYPE "StudioUserRole" AS ENUM ('OWNER', 'MANAGER');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'PAUSED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AttendanceSource" AS ENUM ('MANUAL', 'CSV');

-- CreateEnum
CREATE TYPE "RetentionSnapshotType" AS ENUM ('DAILY', 'SIGNIFICANT_EVENT');

-- CreateTable
CREATE TABLE "Studio" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "isSynthetic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Studio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudioUser" (
    "id" UUID NOT NULL,
    "studioId" UUID NOT NULL,
    "authUserId" UUID NOT NULL,
    "role" "StudioUserRole" NOT NULL DEFAULT 'MANAGER',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudioUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudioSettings" (
    "id" UUID NOT NULL,
    "studioId" UUID NOT NULL,
    "attendanceCoverageFrom" DATE,
    "coverageVerifiedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "StudioSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Member" (
    "id" UUID NOT NULL,
    "studioId" UUID NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "joinedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MembershipPlan" (
    "id" UUID NOT NULL,
    "studioId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "durationDays" INTEGER NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MembershipPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MembershipPeriod" (
    "id" UUID NOT NULL,
    "studioId" UUID NOT NULL,
    "memberId" UUID NOT NULL,
    "planId" UUID NOT NULL,
    "startsAt" DATE NOT NULL,
    "originalEndsAt" DATE NOT NULL,
    "effectiveEndsAt" DATE NOT NULL,
    "status" "MembershipStatus" NOT NULL,
    "renewedFromId" UUID,
    "cancelledAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MembershipPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MembershipPause" (
    "id" UUID NOT NULL,
    "studioId" UUID NOT NULL,
    "periodId" UUID NOT NULL,
    "startsAt" DATE NOT NULL,
    "resumesAt" DATE,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MembershipPause_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceImportBatch" (
    "id" UUID NOT NULL,
    "studioId" UUID NOT NULL,
    "sourceName" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "importedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rowCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AttendanceImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceRecord" (
    "id" UUID NOT NULL,
    "studioId" UUID NOT NULL,
    "memberId" UUID NOT NULL,
    "batchId" UUID,
    "occurredAt" TIMESTAMPTZ(6) NOT NULL,
    "localDate" DATE NOT NULL,
    "source" "AttendanceSource" NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RetentionSnapshot" (
    "id" UUID NOT NULL,
    "studioId" UUID NOT NULL,
    "memberId" UUID NOT NULL,
    "snapshotDate" DATE NOT NULL,
    "snapshotType" "RetentionSnapshotType" NOT NULL,
    "score" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "dimensionScores" JSONB NOT NULL,
    "indicators" JSONB NOT NULL,
    "recommendation" TEXT,
    "isComplete" BOOLEAN NOT NULL,
    "scoringVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RetentionSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChurnPrediction" (
    "id" UUID NOT NULL,
    "studioId" UUID NOT NULL,
    "memberId" UUID NOT NULL,
    "predictionDate" DATE NOT NULL,
    "horizonDays" INTEGER NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "probability" DECIMAL(5,4) NOT NULL,
    "featureSnapshot" JSONB NOT NULL,
    "featureSnapshotAt" TIMESTAMPTZ(6) NOT NULL,
    "featureSchemaVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChurnPrediction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "studioId" UUID NOT NULL,
    "actorId" UUID,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Studio_isSynthetic_idx" ON "Studio"("isSynthetic");

-- CreateIndex
CREATE INDEX "StudioUser_authUserId_idx" ON "StudioUser"("authUserId");

-- CreateIndex
CREATE UNIQUE INDEX "StudioUser_studioId_authUserId_key" ON "StudioUser"("studioId", "authUserId");

-- CreateIndex
CREATE UNIQUE INDEX "StudioUser_id_studioId_key" ON "StudioUser"("id", "studioId");

-- CreateIndex
CREATE UNIQUE INDEX "StudioSettings_studioId_key" ON "StudioSettings"("studioId");

-- CreateIndex
CREATE INDEX "Member_studioId_lastName_firstName_idx" ON "Member"("studioId", "lastName", "firstName");

-- CreateIndex
CREATE UNIQUE INDEX "Member_id_studioId_key" ON "Member"("id", "studioId");

-- CreateIndex
CREATE UNIQUE INDEX "Member_studioId_email_key" ON "Member"("studioId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "MembershipPlan_id_studioId_key" ON "MembershipPlan"("id", "studioId");

-- CreateIndex
CREATE UNIQUE INDEX "MembershipPlan_studioId_name_key" ON "MembershipPlan"("studioId", "name");

-- CreateIndex
CREATE INDEX "MembershipPeriod_studioId_memberId_status_idx" ON "MembershipPeriod"("studioId", "memberId", "status");

-- CreateIndex
CREATE INDEX "MembershipPeriod_studioId_effectiveEndsAt_idx" ON "MembershipPeriod"("studioId", "effectiveEndsAt");

-- CreateIndex
CREATE UNIQUE INDEX "MembershipPeriod_id_studioId_key" ON "MembershipPeriod"("id", "studioId");

-- CreateIndex
CREATE INDEX "MembershipPause_studioId_periodId_startsAt_idx" ON "MembershipPause"("studioId", "periodId", "startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "MembershipPause_id_studioId_key" ON "MembershipPause"("id", "studioId");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceImportBatch_id_studioId_key" ON "AttendanceImportBatch"("id", "studioId");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceImportBatch_studioId_idempotencyKey_key" ON "AttendanceImportBatch"("studioId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "AttendanceRecord_studioId_localDate_idx" ON "AttendanceRecord"("studioId", "localDate");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceRecord_studioId_memberId_localDate_key" ON "AttendanceRecord"("studioId", "memberId", "localDate");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceRecord_id_studioId_key" ON "AttendanceRecord"("id", "studioId");

-- CreateIndex
CREATE INDEX "RetentionSnapshot_studioId_category_snapshotDate_idx" ON "RetentionSnapshot"("studioId", "category", "snapshotDate");

-- CreateIndex
CREATE UNIQUE INDEX "RetentionSnapshot_studioId_memberId_snapshotDate_snapshotTy_key" ON "RetentionSnapshot"("studioId", "memberId", "snapshotDate", "snapshotType", "scoringVersion");

-- CreateIndex
CREATE INDEX "ChurnPrediction_studioId_predictionDate_idx" ON "ChurnPrediction"("studioId", "predictionDate");

-- CreateIndex
CREATE UNIQUE INDEX "ChurnPrediction_studioId_memberId_predictionDate_horizonDay_key" ON "ChurnPrediction"("studioId", "memberId", "predictionDate", "horizonDays", "modelVersion");

-- CreateIndex
CREATE INDEX "AuditLog_studioId_entityType_entityId_idx" ON "AuditLog"("studioId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_studioId_createdAt_idx" ON "AuditLog"("studioId", "createdAt");

-- AddForeignKey
ALTER TABLE "StudioUser" ADD CONSTRAINT "StudioUser_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioSettings" ADD CONSTRAINT "StudioSettings_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipPlan" ADD CONSTRAINT "MembershipPlan_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipPeriod" ADD CONSTRAINT "MembershipPeriod_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipPeriod" ADD CONSTRAINT "MembershipPeriod_memberId_studioId_fkey" FOREIGN KEY ("memberId", "studioId") REFERENCES "Member"("id", "studioId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipPeriod" ADD CONSTRAINT "MembershipPeriod_planId_studioId_fkey" FOREIGN KEY ("planId", "studioId") REFERENCES "MembershipPlan"("id", "studioId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipPeriod" ADD CONSTRAINT "MembershipPeriod_renewedFromId_studioId_fkey" FOREIGN KEY ("renewedFromId", "studioId") REFERENCES "MembershipPeriod"("id", "studioId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipPause" ADD CONSTRAINT "MembershipPause_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipPause" ADD CONSTRAINT "MembershipPause_periodId_studioId_fkey" FOREIGN KEY ("periodId", "studioId") REFERENCES "MembershipPeriod"("id", "studioId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceImportBatch" ADD CONSTRAINT "AttendanceImportBatch_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_memberId_studioId_fkey" FOREIGN KEY ("memberId", "studioId") REFERENCES "Member"("id", "studioId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_batchId_studioId_fkey" FOREIGN KEY ("batchId", "studioId") REFERENCES "AttendanceImportBatch"("id", "studioId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetentionSnapshot" ADD CONSTRAINT "RetentionSnapshot_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetentionSnapshot" ADD CONSTRAINT "RetentionSnapshot_memberId_studioId_fkey" FOREIGN KEY ("memberId", "studioId") REFERENCES "Member"("id", "studioId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChurnPrediction" ADD CONSTRAINT "ChurnPrediction_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChurnPrediction" ADD CONSTRAINT "ChurnPrediction_memberId_studioId_fkey" FOREIGN KEY ("memberId", "studioId") REFERENCES "Member"("id", "studioId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_studioId_fkey" FOREIGN KEY ("actorId", "studioId") REFERENCES "StudioUser"("id", "studioId") ON DELETE RESTRICT ON UPDATE CASCADE;


-- PostgreSQL-specific integrity and tenant isolation.
ALTER TABLE "MembershipPeriod"
  ADD CONSTRAINT "MembershipPeriod_dates_check"
  CHECK (
    "originalEndsAt" >= "startsAt"
    AND "effectiveEndsAt" >= "startsAt"
  );

ALTER TABLE "MembershipPause"
  ADD CONSTRAINT "MembershipPause_dates_check"
  CHECK ("resumesAt" IS NULL OR "resumesAt" >= "startsAt");

CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE UNIQUE INDEX "MembershipPause_one_open_per_period"
  ON "MembershipPause" ("studioId", "periodId")
  WHERE "resumesAt" IS NULL;

ALTER TABLE "MembershipPause"
  ADD CONSTRAINT "MembershipPause_no_overlap"
  EXCLUDE USING gist (
    "studioId" WITH =,
    "periodId" WITH =,
    daterange("startsAt", "resumesAt", '[]') WITH &&
  )
  WHERE ("resumesAt" IS NOT NULL);

ALTER TABLE "MembershipPeriod"
  ADD CONSTRAINT "MembershipPeriod_lifecycle_check"
  CHECK (
    ("status" = 'CANCELLED'
      AND "cancelledAt" IS NOT NULL
      AND "effectiveEndsAt" <= "originalEndsAt")
    OR ("status" <> 'CANCELLED' AND "cancelledAt" IS NULL)
  );

ALTER TABLE "RetentionSnapshot"
  ADD CONSTRAINT "RetentionSnapshot_score_check"
  CHECK ("score" BETWEEN 0 AND 100);

ALTER TABLE "ChurnPrediction"
  ADD CONSTRAINT "ChurnPrediction_probability_check"
  CHECK (
    "probability" >= 0 AND "probability" <= 1
    AND "horizonDays" > 0
    AND "featureSnapshotAt" < ("predictionDate" + 1)
  );

CREATE UNIQUE INDEX "MembershipPeriod_one_current_per_member"
  ON "MembershipPeriod" ("studioId", "memberId")
  WHERE "status" IN ('ACTIVE', 'PAUSED');

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'pranax_app') THEN
    CREATE ROLE pranax_app NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
  END IF;
END $$;

GRANT USAGE ON SCHEMA public TO pranax_app;
GRANT USAGE ON SCHEMA auth TO pranax_app;
GRANT EXECUTE ON FUNCTION auth.uid() TO pranax_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO pranax_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO pranax_app;
GRANT pranax_app TO postgres;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

ALTER TABLE "Studio" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StudioUser" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StudioSettings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Member" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MembershipPlan" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MembershipPeriod" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MembershipPause" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AttendanceImportBatch" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AttendanceRecord" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RetentionSnapshot" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ChurnPrediction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "Studio" FORCE ROW LEVEL SECURITY;
ALTER TABLE "StudioUser" FORCE ROW LEVEL SECURITY;
ALTER TABLE "StudioSettings" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Member" FORCE ROW LEVEL SECURITY;
ALTER TABLE "MembershipPlan" FORCE ROW LEVEL SECURITY;
ALTER TABLE "MembershipPeriod" FORCE ROW LEVEL SECURITY;
ALTER TABLE "MembershipPause" FORCE ROW LEVEL SECURITY;
ALTER TABLE "AttendanceImportBatch" FORCE ROW LEVEL SECURITY;
ALTER TABLE "AttendanceRecord" FORCE ROW LEVEL SECURITY;
ALTER TABLE "RetentionSnapshot" FORCE ROW LEVEL SECURITY;
ALTER TABLE "ChurnPrediction" FORCE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" FORCE ROW LEVEL SECURITY;

CREATE POLICY "Studio_membership_policy" ON "Studio"
  USING (EXISTS (
    SELECT 1 FROM "StudioUser" su
    WHERE su."studioId" = "Studio"."id" AND su."authUserId" = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM "StudioUser" su
    WHERE su."studioId" = "Studio"."id" AND su."authUserId" = auth.uid()
  ));

CREATE POLICY "StudioUser_self_policy" ON "StudioUser"
  USING ("authUserId" = auth.uid())
  WITH CHECK ("authUserId" = auth.uid());

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'StudioSettings', 'Member', 'MembershipPlan',
    'MembershipPeriod', 'MembershipPause', 'AttendanceImportBatch',
    'AttendanceRecord', 'RetentionSnapshot', 'ChurnPrediction', 'AuditLog'
  ] LOOP
    EXECUTE format(
      'CREATE POLICY %I ON %I USING (EXISTS (SELECT 1 FROM "StudioUser" su WHERE su."studioId" = %I."studioId" AND su."authUserId" = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM "StudioUser" su WHERE su."studioId" = %I."studioId" AND su."authUserId" = auth.uid()))',
      table_name || '_membership_policy',
      table_name,
      table_name,
      table_name
    );
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION prevent_retention_snapshot_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Retention snapshots are immutable';
END;
$$;

CREATE TRIGGER "RetentionSnapshot_immutable"
  BEFORE UPDATE OR DELETE ON "RetentionSnapshot"
  FOR EACH ROW EXECUTE FUNCTION prevent_retention_snapshot_mutation();
