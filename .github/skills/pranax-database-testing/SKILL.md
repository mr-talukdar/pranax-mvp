---
name: pranax-database-testing
description: Guides migration, RLS, lifecycle, timezone, synthetic seed, idempotency, and two-tenant database testing for PranaX.
---

# PranaX database testing

Use this skill for database and security verification.

## Required fixtures

- Two independent Supabase Auth users.
- Two independent studios.
- Separate StudioUser memberships.
- One member in each studio.
- Active, paused, expired, and cancelled periods.

## Verification matrix

- Empty database migration.
- Prisma validate and generate.
- Migration status and drift.
- Cross-studio SELECT/INSERT/UPDATE/DELETE.
- Unauthenticated access and invalid JWT/membership.
- Membership removal revocation.
- Concurrent transaction context isolation.
- One current period per member.
- Pause overlap and open-pause limits.
- Attendance uniqueness and timezone boundaries.
- Retention snapshot immutability.
- Seed idempotency and accurate reporting.

## Evidence rules

- Report exact commands and exit status.
- Static checks do not prove RLS or database constraints.
- Do not claim Supabase testing passed without an executed local or authorized database test.
