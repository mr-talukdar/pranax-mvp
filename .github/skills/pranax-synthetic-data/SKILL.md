---
name: pranax-synthetic-data
description: Guides PranaX synthetic business-data generation, deterministic scenarios, validation, export manifests, dataset compatibility, and Prisma seed loading. Use when a task generates, simulates, validates, exports, seeds, or tests synthetic studio data.
---

# PranaX synthetic data

Use this skill for the Synthetic Data Factory and synthetic fixtures. Inspect the actual repository architecture before choosing a directory: the factory must not be assumed to belong inside the production intelligence service. The current repository has no factory or operational schema.

## Required context

Read:

- [system overview](../../../docs/architecture/system-overview.md)
- [service boundaries](../../../docs/architecture/service-boundaries.md)
- [monorepo structure](../../../docs/architecture/monorepo-structure.md)
- [intelligence ownership instructions](../../../services/intelligence/AGENTS.md)
- [repository instructions](../../../AGENTS.md)
- [generation rules](references/generation-rules.md)
- [scenario catalogue](references/scenario-catalog.md)

The frozen baseline is one fictional studio, twelve months of history, Python generation, NumPy/pandas where appropriate, versioned artifacts, and TypeScript plus existing Prisma access for loading. Confirm the actual schema and approved factory location before implementation.

## Architecture and responsibilities

Keep this pipeline one-way:

**Python Synthetic Data Factory → versioned dataset artifacts → validation → TypeScript Prisma seed loader → PostgreSQL**

The Python factory must never connect directly to or write to operational PostgreSQL. Separate generation, validation, serialization, manifest creation, and loading. The loader must validate compatibility, load dependency order in safe transactions or batches, be repeatable and duplicate-safe, identify synthetic tenants explicitly, and never reset or delete real tenant data.

Generate and test studio, members, plans, membership periods, renewals, pauses/resumes, cancellations, churn, reactivation, attendance, and controlled scenarios as separate modules. Behavioural archetypes are generator metadata only; they are never operational member attributes or retention-engine inputs.

## Quality rules

- Require a configurable seed, generator and dataset versions, configuration, generation timestamp, entity counts, scenario identifiers, and a manifest.
- The same generator version, configuration, and seed must yield equivalent business records.
- Respect membership chronology, pause/resume accumulation, original/effective end dates, fourteen-day grace, renewal timing, cancellation effective dates, churn/reactivation, studio-local dates, and attendance coverage.
- Validate referential integrity, tenant ownership, identity uniqueness, chronology, non-overlap, attendance uniqueness, timezone consistency, lifecycle consistency, schema compatibility, and scenario expectations.
- Fail with useful validation errors; never silently repair contradictory records.
- For ML demonstrations, prevent future leakage, use only prediction-time features, exclude archetype labels, split chronologically, label synthetic data explicitly, and never claim real-world model performance from synthetic metrics.
- Generate actual IANA timezone timestamps and derive `localDate` from the studio timezone.
- Test DST boundaries for DST-observing studios and midnight boundaries for `Asia/Kolkata`.
- Attendance is valid for active, paused, expired, and cancelled members; do not reject it merely because it falls outside a membership period.
- Include ACTIVE, PAUSED, EXPIRED, CANCELLED, renewal, non-renewal, grace, churn, and reactivation evidence.
- Keep scenario data as real entities and relationships, not metadata-only fixtures.
- Never generate placeholder retention scores or placeholder churn probabilities unless explicitly marked as excluded demonstration data.

## Workflow

1. Inspect the current factory (if any), schema, loader, architecture, and requirements.
2. Define input configuration, output records, versioning, and expected invariants.
3. Implement deterministic, modular generation without production database access.
4. Validate before export and produce a manifest with limitations.
5. Add focused tests for reproducibility, invariants, and individually identifiable scenarios.
6. Test loader compatibility and idempotency at the TypeScript/database boundary when that boundary exists.
7. Report artifact versions, verification commands, and unresolved limitations.

## Coordination

The database skill owns the operational persistence contract, constraints, migrations, and Prisma loader boundary. This skill owns population simulation, behavioural patterns, scenarios, pre-export validation, and serialization. When both apply, the approved database schema is authoritative; coordinate any format or loader change rather than duplicating business rules.
