# PranaX synthetic generation rules

These rules define the factory boundary; they do not imply that the factory or database exists. The [database skill](../../pranax-database-engineering/SKILL.md) owns the persistence contract and [schema conventions](../../pranax-database-engineering/references/schema-conventions.md) own relational invariants.

## Frozen baseline

| Concern | Rule |
| --- | --- |
| Population | One fictional studio |
| Coverage | Twelve months of historical business data |
| Generator | Python |
| Libraries | NumPy and pandas where appropriate |
| Database | Existing Supabase PostgreSQL, only through the approved loader |
| Schema | Existing Prisma-managed schema |
| Storage | Versioned seed artifacts |
| Loading | TypeScript and existing Prisma database access |

If the repository does not yet provide one of these components, document it as not implemented or TBD rather than scaffolding it as part of a documentation task.

## Module boundaries

Keep studio, member, plan, membership-period, renewal, pause/resume, cancellation/churn, reactivation, attendance, scenario, validation, export, and manifest concerns independently testable. Generation should produce an in-memory or file-based dataset; validation should inspect it; serialization should preserve stable formats; loading should be the only database-facing concern.

## Behavioural metadata

Supported generator-only archetypes are:

- consistent
- gradually disengaging
- erratic
- new
- seasonal
- at-risk
- churned
- reactivated

Archetype labels and parameters explain how records were generated. Do not serialize them as operational member attributes or pass them into deterministic retention scoring or ML features. The resulting business records must be sufficient for downstream systems to derive observed risk.

## Reproducibility and manifests

Every dataset must record:

- random seed;
- generator version;
- dataset version;
- normalized generation configuration;
- generation timestamp;
- entity counts;
- scenario identifiers;
- schema or contract compatibility version;
- validation result and limitations.

Equivalent records, not merely equivalent row counts, are required for repeated generation with the same version, configuration, and seed. Avoid nondeterministic timestamps or unordered serialization in the business-record comparison path.

## Lifecycle simulation

Generate chronologically consistent membership periods, including multiple periods, renewals, pauses/resumes, cancellations, churn, and reactivation. Model the fourteen-day grace period, renewal on or before the relevant grace day, immediate and future-effective cancellation, original and effective end dates, and accumulated pauses without overlapping active/paused periods.

Attendance must use a studio-local timezone, preserve event timestamps and local dates, prevent duplicate member/day records, and declare complete versus incomplete coverage explicitly. Never use an archetype label to manufacture a retention result.

## Data boundary

Export versioned artifacts and validate them before a TypeScript Prisma loader consumes them. The loader must be repeatable, dependency-ordered, transaction-safe or safely batched, tenant-explicit, and protected against duplicate insertion. It must not reset or delete real tenant records.
