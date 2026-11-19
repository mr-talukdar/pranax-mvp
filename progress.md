# PranaX Implementation Progress

**Last updated:** 2026-11-20
**Backlog source:** [PranaX Task-Level Implementation Plan v1.0](docs/architecture/PranaX_Task_Level_Implementation_Plan_v1.0.md)
**Sprint status:** Foundation phase complete; MVP feature implementation remains pending

Progress is evidence-based. A task is complete only when its implementation and relevant verification are present.

## Current Summary

| Area                        | Status                                | Evidence                                                                                                                                                               |
| --------------------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Next.js application backend | In progress                           | Server-side auth, database, validation, service modules and `/api/members` Route Handlers are present.                                                                 |
| Supabase Auth               | Blocked for full browser verification | Server-side `getUser()` and StudioUser membership resolution exist; real Auth sign-in/StudioUser flows were not fully exercised.                                       |
| PostgreSQL and Prisma       | Complete for foundation               | Prisma schema, baseline migration, local Supabase migration, constraints and RLS policies are present.                                                                 |
| Synthetic Data Factory      | Complete for foundation               | Version 1.2 exports 350 members, 441 periods, 36 pauses and 2,356 attendance records.                                                                                  |
| Seed loader                 | Complete for foundation               | Repeat execution skipped 3,189 records with zero inserts and zero rejections.                                                                                          |
| MVP member/attendance UI    | Not started                           | Foundation only; product feature tasks remain pending.                                                                                                                 |
| Retention engine            | In progress                           | Deterministic Python engine, authenticated FastAPI endpoint, and tenant-scoped Next.js assessment route are implemented; database-backed Auth flow remains unverified. |
| Churn ML                    | Deferred                              | Synthetic predictions are excluded; no trained model is implemented.                                                                                                   |
| Conversational intelligence | Deferred                              | No product implementation.                                                                                                                                             |
| Owner dashboard             | Not started                           | No operational dashboard workflow is implemented.                                                                                                                      |

## Backlog Phase Status

| Phase                                       | Status          | Notes                                                                                                                                               |
| ------------------------------------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Phase 0 - Sprint setup                      | In progress     | Workspace, scripts, environment documentation and local Supabase setup are established. Git pull and team demo setup remain external.               |
| Phase 1 - Tenant and application foundation | In progress     | Next.js server modules and RLS foundations exist; final browser Auth acceptance remains untested.                                                   |
| Phase 2 - Member management                 | Partial         | Server-side member list/create operations exist, but profile editing and membership UI/workflows are not implemented.                               |
| Phase 3 - Attendance tracking               | Foundation only | Attendance persistence and synthetic attendance exist; manual UI/import workflow is not implemented.                                                |
| Phase 4 - Retention intelligence            | In progress     | RET-01 through RET-07 have a deterministic engine, typed contracts, API, and focused tests. Snapshot history and retention UI remain unimplemented. |
| Phase 5 - Owner dashboard                   | Not started     | No dashboard feature implementation.                                                                                                                |
| Phase 6 - Churn ML                          | Deferred        | Schema support exists; no model training or inference.                                                                                              |
| Phase 7 - Conversational intelligence       | Deferred        | No implementation.                                                                                                                                  |
| Phase 8 - Integration, QA and demo          | Partial         | TypeScript, database and synthetic checks pass; full end-to-end MVP workflow is not implemented.                                                    |

## Verified Foundation Tasks

### SET-01 and SET-02

- [x] pnpm workspace and scripts are configured.
- [x] Local Supabase CLI and Docker configuration are available.
- [x] Prisma schema validates and the Prisma Client generates.
- [x] Environment variables are documented without real credentials.
- [x] Next.js Route Handlers and server modules compile and build.
- [x] Python and intelligence test environments are configured.
- [ ] A complete browser sign-in session is verified.

### FND-01 and FND-02

- [x] Server-side StudioUser membership resolution is implemented.
- [x] Browser studio selection is treated as a request and revalidated against StudioUser.
- [x] RLS is enabled and FORCE RLS applies to tenant-owned tables.
- [x] Cross-tenant INSERT raises RLS violation.
- [x] Cross-tenant UPDATE and DELETE affect zero rows.
- [ ] Real two-user Supabase Auth sessions are verified end-to-end.
- [ ] Membership removal revocation is verified with real Auth users.

### Database

- [x] OWNER and MANAGER are the only MVP roles.
- [x] Composite tenant ownership exists for membership renewal relationships.
- [x] Membership date and cancellation constraints exist.
- [x] One-active-or-paused-period constraint exists.
- [x] Retention snapshots are immutable at the database level.
- [x] Churn prediction probability and provenance fields are constrained.
- [ ] Full timezone/DST database tests are available.

### Synthetic data

- [x] One fictional studio is generated for a 12-month dataset.
- [x] 300-500 member population support is retained.
- [x] ACTIVE, PAUSED, EXPIRED and CANCELLED periods are generated.
- [x] Renewal, non-renewal, grace, churn and reactivation relationships are represented.
- [x] Two-pause scenario records exist.
- [x] Attendance local dates and IANA timezone offsets are generated.
- [x] Placeholder retention snapshots and churn predictions are excluded.
- [x] Dataset reproducibility and 10-scenario validation pass.

### Seed loader

- [x] Zod manifest and record validation are used.
- [x] Tenant consistency checks are enforced.
- [x] Loading is transactional.
- [x] Existing records are skipped instead of updated.
- [x] First and repeat execution produce accurate separate counts.
- [x] Retention snapshot updates are not silently performed.
- [ ] Reset/seed behavior is covered by a dedicated automated integration suite.

### Retention intelligence implementation

- [x] Typed Python assessment input/output contracts and shared TypeScript boundary schemas exist.
- [x] Explicit verified coverage, membership-history completeness, paused-member exclusion, and limited assessments are implemented.
- [x] Attendance recency, decline, provisional personal cadence consistency, membership expiry, and historical renewal dimensions return supporting evidence.
- [x] Lifecycle state and dated churn/reactivation events are derived from as-of membership periods, cancellations, and recorded pauses; repeated episodes are preserved.
- [x] Unavailable dimensions are excluded and configured weights are proportionally redistributed.
- [x] Exactly one deterministic recommendation is returned for complete, limited, and excluded results.
- [x] FastAPI assessment requests require the configured shared service bearer token; health remains available.
- [x] Next.js retrieves evidence in verified studio scope and validates the service response; snapshots are not persisted.
- [ ] Real Supabase Auth/browser flow and database-backed assessment request are executed end-to-end.
- [ ] Coverage verification-through semantics are confirmed; the current adapter interprets `coverageVerifiedAt` as verified through its studio-local date.
- [ ] Retention snapshots, deduplication/history, dashboard/attention queue, and production service network isolation remain unimplemented or unverified.

## Verification Evidence

Last executed:

```text
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm format:check
pnpm synthetic:test
prisma validate
prisma migrate deploy
prisma migrate status
supabase start
supabase db reset --no-seed
```

Actual results:

- TypeScript typecheck: passed.
- ESLint: passed.
- Vitest workspace tests: passed.
- Next.js build: passed.
- Focused Prettier check: passed.
- Synthetic pytest suite: 5 passed.
- Intelligence pytest suite: 1 passed.
- Prisma validation: passed.
- Empty local Supabase migration: passed.
- Migration status: up to date.
- Repeat seed: 0 inserts, 3,189 skips, 0 rejects.

Retention implementation verification:

```text
.venv-intelligence/bin/pytest services/intelligence/tests -q
85 passed; 2 third-party deprecation warnings.
```

Focused retention tests cover contract validation and serialization, token enforcement and safe validation errors, 60/59-day coverage, complete zero-attendance coverage, missing/incomplete coverage, paused/expired/cancellation lifecycle cases, recency and decline boundaries, cadence calibration boundaries, renewal grace and opportunity counts, proportional weight redistribution, recommendation categories and precedence, Asia/Kolkata midnight, New York DST boundaries, and future-record leakage.

Additional checks for this implementation:

- `pnpm typecheck`: passed.
- `pnpm lint`: passed.
- `pnpm test`: passed (3 tests across the contracts/database workspace suites).
- `pnpm build`: passed; Next.js reports the repository's existing missing ESLint Next.js plugin warning.
- `.venv/bin/pytest tools/synthetic-data/tests -q`: 5 passed.
- Focused Prettier check for changed TS/Markdown files: passed.
- `pnpm format:check`: not clean; it flags `.github/ISSUE_TEMPLATE/task.yml`, two synthetic-data skill references, two architecture handoff documents, and `pnpm-lock.yaml`. Focused checks for changed TypeScript/Markdown files pass; unrelated source documents were not reformatted.
- Database-backed retention, live Supabase Auth, hosted service networking, and snapshot persistence: not tested or implemented.

## Next Evidence-Backed Work

1. Complete real Supabase Auth sign-in and StudioUser membership testing.
2. Add automated RLS Vitest/PostgreSQL integration coverage.
3. Implement member lifecycle and attendance workflows in Next.js only after the foundation tests are stable.
4. Verify tenant-scoped retention requests against local Supabase/Auth and confirm coverage-through semantics.
5. Implement only the MVP owner dashboard and attention queue after tenant-scoped attendance and membership flows exist.
6. Add a dedicated migration/test skill workflow and keep this ledger synchronized after every implementation phase.

## Status Definitions

- **Complete:** implementation and verification evidence both exist.
- **In progress:** implementation exists but acceptance evidence is incomplete.
- **Partial:** some task scope exists, but the full plan task is not complete.
- **Blocked:** external configuration or infrastructure is required.
- **Deferred:** outside the current foundation sprint.
- **Not started:** no implementation evidence exists.
