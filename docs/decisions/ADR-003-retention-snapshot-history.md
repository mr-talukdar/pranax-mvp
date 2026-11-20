# ADR-003: Immutable retention snapshot history

## Status

Accepted for the RET-08 MVP.

## Context

The Next.js application is responsible for verified tenant access and operational persistence. The retention engine returns validated complete, limited, or excluded assessments. Existing snapshots are append-only and protected by a PostgreSQL trigger. The original uniqueness key could prevent same-day event history and did not distinguish repeated calculations from changed results.

## Decision

- Persist only complete assessments with non-null score and category. Limited and excluded assessments remain available in the assessment response but do not create risk snapshots; this avoids fabricated scores and preserves the schema's non-null score/category constraint.
- Keep existing score, category, dimensions, indicators, recommendation title, completeness flag, and scoring version columns. Store assessment timestamp, status, lifecycle state/events, full recommendation, and completeness reasons in nullable JSONB `assessmentMetadata`.
- Store a SHA-256 fingerprint of the validated assessment result, excluding `assessed_at`, so repeated calculations of the same result deduplicate even when calculated at different times.
- Enforce one DAILY snapshot per member, studio, and local assessment date with a PostgreSQL partial unique index, including across scoring-version changes. The fingerprint unique key makes event inserts idempotent while allowing multiple distinct significant events on one date.
- Use PostgreSQL conflict handling for all inserts. Do not update or delete snapshots; preserve the immutability trigger and tenant RLS policies.
- A score shift of 10 or more points is the provisional MVP significance threshold, named `RETENTION_SIGNIFICANT_SCORE_DELTA` in the Next.js retention service for code-level configuration. Category, lifecycle, recommendation, and completeness changes are also significant.
- History queries require verified StudioContext and filter by both studio and member. The history endpoint returns records chronologically, with bounded offset pagination.

## Consequences

- Deployments must apply both Prisma migrations before using persistence or history.
- Existing rows receive deterministic legacy fingerprints derived from their immutable IDs. Their newly added assessment metadata remains null; history represents unavailable legacy timestamp, lifecycle, status, and structured recommendation fields as null rather than fabricating values. No existing snapshot data is rewritten beyond the fingerprint backfill.
- Limited assessments are not represented in persisted history until a future schema change supports nullable score/category and explicit status.
- PostgreSQL uniqueness, rather than a read-before-write check, is the final duplicate authority under concurrency.
- The 10-point threshold is provisional and should be revisited with product evidence.
