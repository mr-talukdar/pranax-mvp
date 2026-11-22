# PranaX Implementation Progress

**Last updated:** 2026-11-22
**Backlog source:** [PranaX Task-Level Implementation Plan v1.0](docs/architecture/PranaX_Task_Level_Implementation_Plan_v1.0.md)
**Sprint status:** Core MVP features, UI workflows, retention intelligence, and conversational assistant implemented

Progress is evidence-based. A task is complete only when its implementation and relevant verification are present.

## Current Summary

| Area                        | Status   | Evidence                                                                                                                                                                                                             |
| --------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Next.js application backend | Complete | Server-side auth, database context, validation schemas, service modules, and Route Handlers (`/api/members`, `/api/attendance`, `/api/dashboard`, `/api/assistant`, `/api/auth`) are implemented and active.         |
| Supabase Auth & Onboarding  | Complete | Supabase Auth SSR session cookies, `/auth/callback`, public landing page `/`, studio onboarding/bootstrap, and demo workspace switcher with public credentials (`apps/web/public/demo-credentials.json`).            |
| PostgreSQL and Prisma       | Complete | Prisma schema, migrations, RLS policies, composite tenant ownership, and seed loader for synthetic datasets.                                                                                                         |
| Synthetic Data Factory      | Complete | Standalone Python generator exporting versioned 12-month synthetic datasets (v1.2.0, v1.3.0) with reproducible seed scenarios.                                                                                       |
| Seed loader                 | Complete | Transactional Prisma seed loader with Zod validation, idempotent skip checks, and tenant validation.                                                                                                                 |
| MVP Member & Attendance UI  | Complete | Full UI in `apps/web`: member directory (`/members`), member profile (`/members/[id]`), member creation (`/members/new`), check-in (`/attendance`), and CSV batch import (`/attendance/import`).                     |
| Retention engine            | Complete | Deterministic Python engine, authenticated FastAPI endpoints, immutable snapshot persistence, point-in-time factor attribution, and rule-based/LLM recommendations.                                                  |
| Guarded AI Assistant        | Complete | Guarded conversational studio analytics assistant in FastAPI and Next.js (`/assistant`), intent routing over 4 approved operations, zero PII, evidence citation, and Gemini integration with deterministic fallback. |
| Owner dashboard             | Complete | Command center dashboard (`/dashboard`) aggregating active members, check-ins today, 14-day zero-filled attendance trends, membership breakdown, retention risk distribution, and Attention Queue.                   |
| Churn ML                    | Deferred | Schema support and feature preparation defined; production model training and inference remain deferred post-MVP.                                                                                                    |

## Backlog Phase Status

| Phase                                       | Status   | Notes                                                                                                                                                                      |
| ------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Phase 0 - Sprint setup                      | Complete | Workspace, scripts, environment configuration, database tooling, and local test runners are established.                                                                   |
| Phase 1 - Tenant and application foundation | Complete | `withVerifiedStudioContext`, Supabase Auth SSR, RLS enforcement, and studio bootstrap function are fully operational.                                                      |
| Phase 2 - Member management                 | Complete | Member directory, profile view, member creation, predefined plans (Monthly, Quarterly, Annual), renewal, pause/resume, and cancellation workflows are implemented.         |
| Phase 3 - Attendance tracking               | Complete | Manual session check-in, attendance logs, engagement metrics calculation, and bulk CSV attendance import with column mapping and pre-validation preview are implemented.   |
| Phase 4 - Retention intelligence            | Complete | Multi-factor scoring engine, immutable snapshots (`RetentionSnapshot`), factor attribution, history API, attention queue, and grounded recommendations are operational.    |
| Phase 5 - Owner dashboard                   | Complete | Unified owner dashboard with real-time operational aggregates, local timezone calendar alignment, unbroken attendance trends, retention distribution, and attention queue. |
| Phase 6 - Churn ML                          | Deferred | Database schema fields and evaluation structure defined; production training deferred to post-MVP.                                                                         |
| Phase 7 - Conversational intelligence       | Complete | Guarded studio analytics assistant implemented with server-side intent routing, 4 read-only operations, zero PII, and evidence-grounded Gemini responses.                  |
| Phase 8 - Integration, QA and demo          | Complete | End-to-end integration verified across web application, database layer, synthetic datasets, and intelligence service.                                                      |

## Verified Foundation Tasks

### SET-01, SET-02, and SET-03

- [x] pnpm workspace and package scripts are configured.
- [x] Local Supabase and PostgreSQL configuration are available.
- [x] Prisma schema validates and Prisma Client generates cleanly.
- [x] Environment variables are documented in `.env.example` without real credentials.
- [x] Next.js Route Handlers and server modules compile and build.
- [x] Python and intelligence test environments are configured.
- [x] Shared TypeScript contracts in `@pranax/contracts` define API boundaries.
- [x] Core demo scenario and synthetic dataset v1.3.0 are established.

### FND-01, FND-02, and FND-03

- [x] Server-side `StudioUser` membership resolution is implemented.
- [x] Browser studio selection is treated as a request and revalidated against `StudioUser`.
- [x] RLS is enabled and `FORCE ROW LEVEL SECURITY` applies to tenant-owned tables.
- [x] Cross-tenant access is rejected at both the application context and database levels.
- [x] Studio bootstrapping creates an initial studio on verified user signup.
- [x] Shared application conventions for error responses, dates, timezones, and logging are implemented.

### Database

- [x] `OWNER` and `MANAGER` roles are supported.
- [x] Composite tenant ownership exists for membership renewal relationships.
- [x] Membership date and cancellation constraints exist.
- [x] One-active-or-paused-period constraint exists.
- [x] Retention snapshots are immutable at the database level.
- [x] Churn prediction probability and provenance fields are constrained.
- [x] Fingerprint unique constraint ensures idempotent snapshot persistence.

### Synthetic Data & Seed Loader

- [x] Multi-month synthetic datasets (v1.2.0, v1.3.0) generated deterministically.
- [x] 350+ member population with realistic attendance, membership periods, and pause histories.
- [x] Transactional Prisma seed loader with Zod validation.
- [x] Idempotent skip checks prevent duplicate inserts on repeat runs.

### Operational Features (F01, F02, F06)

- [x] Member registration, directory, and profile views (`MEM-01` to `MEM-05`).
- [x] Manual check-in and duplicate protection on local calendar dates (`ATT-01`, `ATT-02`).
- [x] Bulk CSV attendance import with preview and error reporting (`ATT-03`).
- [x] Engagement metrics computation (`ATT-04`).
- [x] Studio overview, membership overview, attendance trend series, and attention queue (`DASH-01` to `DASH-05`).

### Retention Intelligence & Assistant (F03, F07)

- [x] Multi-factor deterministic risk calculation in Python FastAPI service (`RET-01` to `RET-07`).
- [x] Immutable snapshot persistence with change threshold evaluation (`RET-08`).
- [x] Retention profile and attention queue in UI (`RET-09`).
- [x] Guarded Conversational Assistant with 4 read-only aggregate operations (`CONV-01` to `CONV-03`).
- [x] Zero PII leakage and evidence citations ([ADR-005](docs/decisions/ADR-005-conversational-assistant.md)).

## Verification Commands

```bash
# Typecheck
pnpm typecheck

# Lint
pnpm lint

# Unit tests
pnpm test

# Python tests
python3 -m pytest tools/synthetic-data/tests -q
python3 -m pytest services/intelligence/tests -q

# Build
pnpm build
```

## Next Work (Post-MVP)

1. Collect real-world studio data to validate and calibrate retention scoring bands.
2. Develop and train baseline/challenger churn prediction models (Phase 6).
3. Expand conversational assistant query operations (e.g. instructor schedules, financial reporting).
4. Implement self-service multi-studio management and custom role definitions.
