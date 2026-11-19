---
name: pranax-progress-update
description: Updates PranaX implementation progress from the Task-Level Implementation Plan, repository evidence, test results, migration status and synthetic-data verification. Use when asked to report, synchronize or maintain sprint progress.
---

# PranaX progress update

Use the task plan as the backlog source and [progress.md](../../../progress.md) as the maintained ledger.

Required source:

- [PranaX Task-Level Implementation Plan v1.0](../../../docs/architecture/PranaX_Task_Level_Implementation_Plan_v1.0.md)

Optional supporting sources:

- Git status and diff.
- Architecture and ADR documents.
- Existing test reports.
- Prisma migrate status.
- Supabase status and RLS test output.
- Synthetic manifest and pytest results.

## Update procedure

1. Read the task plan and locate the relevant phase/task IDs.
2. Inspect implementation files and verification evidence.
3. Update [progress.md](../../../progress.md), not only the plan.
4. Preserve task IDs and acceptance criteria.
5. Use only these statuses: Complete, In progress, Partial, Blocked, Deferred, Not started.
6. Record exact commands and actual outcomes.
7. Do not mark a task complete solely because code exists.
8. Do not claim migration, RLS, build or test success without executed evidence.
9. Preserve unresolved infrastructure requirements explicitly.
10. Keep dates and counts synchronized with the latest verified run.

## Plan synchronization

If the task plan itself contains checkbox acceptance criteria:

- Mark a checkbox only after implementation and executable verification.
- Leave it unchecked when only static code or a plausible design exists.
- Do not rewrite task scope or silently alter priorities.
- Record missing evidence in the progress ledger.

## Evidence checklist

Before marking database or security work complete, require executed evidence:

- Migration status or migration deployment output.
- Constraint and RLS test output.
- Cross-tenant denial evidence.
- Seed idempotency output.

Before marking synthetic data work complete, require:

- pytest output.
- Generated manifest and counts.
- Determinism and scenario validation.
- No placeholder operational intelligence outputs.

Before marking frontend or application work complete, require:

- Build/typecheck evidence.
- Relevant route, action or component tests.
- Authentication and studio authorization verification.

## Prohibited patterns

- Do not infer success from file presence.
- Do not overwrite human notes or roadmap decisions.
- Do not silently convert a documented risk into a pass.
- Do not add retrospective claims without timestamps and commands.
- Do not edit the implementation plan's source-of-truth requirements merely to fit progress.
