ALTER TABLE "RetentionSnapshot"
  ADD COLUMN "assessmentFingerprint" CHAR(64);

UPDATE "RetentionSnapshot"
SET "assessmentFingerprint" = repeat('0', 32) || md5("id"::text)
WHERE "assessmentFingerprint" IS NULL;

ALTER TABLE "RetentionSnapshot"
  ALTER COLUMN "assessmentFingerprint" SET NOT NULL;

DROP INDEX "RetentionSnapshot_studioId_memberId_snapshotDate_snapshotTy_key";

CREATE UNIQUE INDEX "RetentionSnapshot_assessmentFingerprint_key"
  ON "RetentionSnapshot"(
    "studioId",
    "memberId",
    "snapshotDate",
    "scoringVersion",
    "assessmentFingerprint"
  );

CREATE UNIQUE INDEX "RetentionSnapshot_one_daily_per_member_date"
  ON "RetentionSnapshot"("studioId", "memberId", "snapshotDate")
  WHERE "snapshotType" = 'DAILY';

CREATE INDEX "RetentionSnapshot_studioId_memberId_snapshotDate_createdAt_idx"
  ON "RetentionSnapshot"("studioId", "memberId", "snapshotDate", "createdAt");
