---
name: pranax-synthetic-data
description: Guides PranaX synthetic business-data generation, deterministic scenarios, validation, export manifests, dataset compatibility, and Prisma seed loading. Adapted from Copilot skill for Antigravity.
---

# PranaX Synthetic Data (Antigravity Adapted)

> **Source Attribution:** Adapted from `.github/skills/pranax-synthetic-data/SKILL.md` for native Antigravity workspace execution. Preserves all frozen baseline rules, scenario constraints, and domain invariants.

Use this skill for generating, testing, validating, exporting, and seeding synthetic fitness studio datasets for PranaX.

## Required Context

Read:
- [System Overview](../../../docs/architecture/system-overview.md)
- [Service Boundaries](../../../docs/architecture/service-boundaries.md)
- [Monorepo Structure](../../../docs/architecture/monorepo-structure.md)
- [Generation Rules](references/generation-rules.md)
- [Scenario Catalogue](references/scenario-catalog.md)

## Architecture and Pipeline

The synthetic data lifecycle is strictly **one-way**:

$$\text{Python Synthetic Data Factory} \longrightarrow \text{Versioned JSON Artifacts} \longrightarrow \text{Domain Validation} \longrightarrow \text{TypeScript Prisma Loader} \longrightarrow \text{PostgreSQL}$$

1. **Python Synthetic Factory (`tools/synthetic-data/`):**
   - Pure, deterministic in-memory generation.
   - Never connects directly to or writes to operational PostgreSQL.
   - Driven by `GeneratorConfig(seed, member_count, months, evaluation_date, timezone, studio_name, branch, studio_id)`.
   - Produces realistic names, reserved `.example.invalid` email addresses, and non-real phone numbers.
2. **Domain Invariant Validation (`synthetic_data.validation`):**
   - Asserts 17 relational, chronological, and scenario invariants before any artifact is exported.
3. **Artifact Serialization (`synthetic_data.exporter`):**
   - Writes versioned JSON dataset and manifest with configuration, entity counts, schema version, and seed metadata.
4. **TypeScript Seed Loader (`packages/database/src/seed.ts`):**
   - Validates manifest and synthetic-only studio constraints (`isSynthetic === true`).
   - Executes inside a single atomic Prisma transaction (`prisma.$transaction`).
   - Idempotently skips already existing records using primary key lookups.
   - Never modifies or deletes records belonging to real tenant studios.

## Operational Quality Rules

- **Deterministic Seeds:** The same seed and configuration must yield identical business records across runs.
- **Timezone Awareness:** Studio dates must use the studio's configured IANA timezone (`Asia/Kolkata` for ARS Pilates & Fitness). Timestamps must carry the appropriate UTC offset (`+05:30`), and `localDate` must reflect the local calendar date without UTC day drift.
- **Lifelike Attendance Cadence:** Regular members must exhibit realistic boutique fitness visit frequencies (1–4 visits/week) rather than sparse annual visits, ensuring downstream retention scoring receives realistic recency signals.
- **Lifecycle Integrity:**
  - Enforce strictly at most one current active or paused membership period per member.
  - Pauses extend `effectiveEndsAt` by the exact elapsed pause duration.
  - Cancellations preserve historical records and set `cancelledAt`.
  - Attendance is valid across active, paused, expired, and cancelled members without blocking.
- **Retention Engine Handoff:**
  - Never fabricate retention risk scores or insert arbitrary categories.
  - Retention snapshots must be generated offline through the deterministic Python retention engine (`assess_retention`), evaluating observed member attendance, coverage, and membership evidence.

## Execution Procedures

### 1. Generate Dataset
```bash
PYTHONPATH=tools/synthetic-data/src python3 -m synthetic_data.cli \
  --output datasets/synthetic-demo-ars-pilates-v1.3.0.json \
  --members 350 \
  --seed 20261120
```

### 2. Run Factory Unit & Invariant Tests
```bash
PYTHONPATH=tools/synthetic-data/src .venv-intelligence/bin/pytest tools/synthetic-data/tests -v
```

### 3. Transactional Database Seeding (When Authorized)
```bash
pnpm --filter @pranax/database db:seed datasets/synthetic-demo-ars-pilates-v1.3.0.json
```
