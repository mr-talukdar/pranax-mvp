# PranaX Synthetic Generation Rules (Antigravity Adapted)

> **Source Attribution:** Adapted from `.github/skills/pranax-synthetic-data/references/generation-rules.md`.

These rules define the boundary and invariants of the PranaX Synthetic Data Factory.

## Baseline Constraints

| Concern | Rule |
| :--- | :--- |
| **Studio Scope** | Dedicated synthetic studio (`isSynthetic: true`) |
| **Reporting Date** | Evaluation anchor date (e.g., `2026-11-20`) |
| **Historical Depth** | Approximately 12–15 months of historical business operations |
| **Language & Engine**| Standalone Python generator (dataclasses, random with seed) |
| **Schema Authority** | Prisma-managed PostgreSQL schema |
| **Storage** | Versioned seed JSON artifacts + manifests under `datasets/` |
| **Loading Authority**| TypeScript transactional Prisma loader (`packages/database/src/seed.ts`) |

## Behavioral Archetypes & Metadata

Supported generator archetypes:
1. `engaged_regular`: 2.5–4.5 visits/week, active plan with ample validity, Low retention risk.
2. `gradually_disengaging`: 3 visits/week historically, dropping to 0–1 in last 30 days, High retention risk.
3. `active_inconsistent`: Erratic visits, 7–16 day gaps, Medium retention risk.
4. `paused`: Active `MembershipPause` covering the evaluation date, excluded from active scoring.
5. `recently_lapsed`: Membership expired within last 1–45 days, excluded from active scoring.
6. `churned`: Cancelled or expired months ago, zero visits in last 90 days.
7. `reactivated`: Churn gap followed by new active renewal.
8. `new_onboarding`: Joined in last 7–21 days on trial or monthly plan.
9. `zero_visits_covered`: Verified attendance coverage with exactly zero visits.

**Crucial Invariant:** Archetype labels are generator metadata only. They are never serialized as operational database attributes or passed as inputs to retention scoring. Downstream analytics must derive observed risk strictly from recorded business records.

## Manifest Requirements

Every exported dataset must provide a matching `.manifest.json` containing:
- `seed`: Integer RNG seed for reproducibility.
- `datasetVersion`: Semantic version string (e.g., `1.3.0`).
- `generatorVersion`: Generator implementation version.
- `generatedAt`: ISO 8601 generation timestamp.
- `syntheticStudioId`: UUID of the generated synthetic studio.
- `scenarioIds`: List of 10 stable scenario identifiers.
- `entityCounts`: Exact counts of all generated collections.
- `config`: Input parameters used for generation.
