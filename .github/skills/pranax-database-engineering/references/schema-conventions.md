# PranaX schema conventions and domain rules

This reference is the domain checklist for database work. It does not create a schema or override an approved architecture decision. The authoritative repository context is in the [system overview](../../../../docs/architecture/system-overview.md), [multi-tenancy guidance](../../../../docs/architecture/multi-tenancy.md), and [service boundaries](../../../../docs/architecture/service-boundaries.md).

## Tenancy

- Every studio-owned record carries an auditable studio ownership path.
- Enforce tenant scope in server-side queries and authorization, not only in UI state.
- Tenant-scoped uniqueness and relationships must prevent cross-studio references.
- RLS is required for exposed tenant-owned tables once the approved Supabase/PostgreSQL isolation pattern exists.
- Treat cross-tenant administration, deletion, export, analytics, and audit behavior as explicit decisions.

## Members and memberships

- Member identity is separate from membership periods.
- A member belongs to a studio and may exist without an active membership.
- A member can have multiple historical membership periods. Renewal creates a new period.
- Preserve original and effective membership end dates.
- A period can contain multiple pause/resume events; only one membership period may be active or paused for a member at a time.
- Expired, lapsed, and churned states are derived lifecycle outcomes, not an excuse to erase history.
- Churn may occur multiple times in one member history.

## Attendance and coverage

- Enforce at most one attendance record per member, studio, and studio-local calendar day.
- Store the event timestamp and the resolved studio-local attendance date.
- Preserve attendance history and support manual and CSV imports through idempotent, duplicate-safe operations.
- Track the explicit date from which attendance data is complete. Never infer completeness from the oldest attendance row.
- Make timezone conversion and the studio timezone an explicit, validated boundary.

## Retention and ML

- Deterministic retention assessments and ML predictions are separate records and workflows.
- Retention snapshots preserve dimension scores, indicators, recommendations, completeness, and scoring version. Historical snapshots are immutable.
- Churn predictions preserve prediction horizon, model version, probability, and a feature snapshot.
- Features must be available at prediction time; outcomes and future observations must not leak into features.

## Physical design checklist

- Use UUID primary keys and explicit foreign keys where the selected Prisma/PostgreSQL design supports them.
- Add indexes for actual tenant-scoped access paths, lifecycle queries, and time-window queries; justify each index.
- Use composite unique constraints for tenant-scoped identities and idempotency keys.
- Choose timestamp, date, numeric, enum, and text types deliberately for PostgreSQL semantics.
- Define deletion behavior so historical attendance, assessments, and prediction evidence are not silently destroyed.
- Use database constraints for non-overlap and other invariants where supported; document any trigger, exclusion constraint, or SQL migration not represented directly in Prisma.
