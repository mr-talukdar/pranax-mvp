---
name: pranax-database-engineering
description: Guides PranaX database design, Prisma and PostgreSQL implementation, migrations, tenant isolation, integrity review, debugging, and database testing. Use when a task changes or investigates persistent data, schemas, constraints, queries, migrations, or Prisma seed loading.
---

# PranaX database engineering

Use this skill for operational database work in PranaX. Read the relevant repository architecture before editing. The repository currently documents Supabase PostgreSQL and Prisma as intended choices, but no database schema or application is scaffolded; do not present planned architecture as implemented.

## Required context

Read:

- [system overview](../../../docs/architecture/system-overview.md)
- [service boundaries](../../../docs/architecture/service-boundaries.md)
- [multi-tenancy guidance](../../../docs/architecture/multi-tenancy.md)
- [monorepo structure](../../../docs/architecture/monorepo-structure.md)
- [Repository instructions](../../../AGENTS.md)
- [repository instructions](../../../AGENTS.md)
- [schema conventions and domain rules](references/schema-conventions.md)

Resolve any TBD architecture choice through an approved decision before implementing it. Keep database models internal to the owning service; promote only deliberate external contracts.

## Engineering rules

- Keep the API responsible for authorization, tenant enforcement, and primary data access. Do not put database access in the web application or make the intelligence service the primary CRUD owner.
- Use Prisma with the approved PostgreSQL database once that integration exists. Do not introduce another ORM, database, or undocumented provider.
- Prefer UUID primary keys, explicit relationships, appropriate PostgreSQL types, referential actions, tenant-aware unique constraints, and indexes that support verified access paths.
- Use transactions for multi-record invariants and inspect generated migration SQL before applying it.
- Use database constraints for enforceable integrity and application validation for actionable boundary errors. Document PostgreSQL constraints that Prisma cannot express directly.
- Every tenant-owned operation must use a server-established studio context. Never authorize from a client-supplied `studioId`.
- Exposed tenant-owned tables require approved row-level security policies. Do not invent a tenancy propagation or RLS pattern while the repository decision remains TBD.
- Keep service-role credentials out of frontend code, use least privilege, preserve historical records intentionally, and never bypass isolation for development or seeding.
- Surface migration, validation, and test failures. Do not claim a migration or test succeeded without executing it.
- Supabase Auth is the runtime identity authority. `StudioUser` membership is the studio authorization authority.
- The normal application database role must use RLS; a studio ID or `app.studio_id` setting never grants access.
- Keep Prisma transaction identity and studio context transaction-local. Do not use process-global mutable state.
- Use composite tenant-aware foreign keys for cross-tenant-sensitive renewals, pauses, batches, attendance, snapshots, and predictions.
- Retention snapshots are append-only; cancellation and effective dates must be represented independently of original end dates.

## Frozen domain rules

Apply the modelling rules in [schema conventions](references/schema-conventions.md) for members, membership periods and lifecycle events, attendance and coverage, deterministic retention assessments, and separate churn predictions. In particular, do not make an active membership a prerequisite for a member, infer complete attendance coverage from the oldest record, overwrite immutable retention snapshots, or use retention labels as a substitute for ML feature snapshots.

## Workflow

1. Inspect the current schema, architecture, owning service, tests, and existing migrations.
2. Identify affected entities, relationships, invariants, tenant boundaries, and historical-retention requirements.
3. Explain the smallest model change and its trade-offs, including constraints and indexes.
4. Implement only the approved scope with typed, parameterized access.
5. Review generated migration SQL and check destructive or irreversible behavior.
6. Add focused tests for integrity, authorization, tenant isolation, and boundary failures.
7. Run the relevant validation, migration checks, and tests; report actual results.
8. Record unresolved risks or required ADRs rather than guessing.

## Coordination

When synthetic data work is involved, this skill owns the persistence contract, constraints, migrations, and TypeScript/Prisma loading boundary. Coordinate dataset changes with [pranax-synthetic-data](../pranax-synthetic-data/SKILL.md); do not redefine its generation or scenario rules here.
