---
name: pranax-database-testing
description: Guides migration, RLS, lifecycle, timezone, synthetic seed, idempotency, and two-tenant database testing for PranaX. Adapted from Copilot skill for Antigravity.
---

# PranaX Database Testing (Antigravity Adapted)

> **Source Attribution:** Adapted from `.github/skills/pranax-database-testing/SKILL.md`.

Use this skill for database and security verification across migrations, RLS, domain services, and synthetic seed loading.

## Verification Matrix

1. **Schema Validation:**
   - Run `pnpm --filter @pranax/database validate` and `pnpm --filter @pranax/database test`.
2. **Seed Idempotency:**
   - Seeding the same dataset twice must report `skipped` for existing records and perform zero duplicate inserts.
3. **Synthetic Tenant Isolation:**
   - All synthetic records must be strictly contained within `isSynthetic: true` studios.
   - Refuse to reset or truncate non-synthetic studio data.
4. **Attendance Uniqueness:**
   - Verify `@@unique([studioId, memberId, localDate])` rejection on same-day duplicate check-ins.
5. **Membership Invariants:**
   - Verify rejection of concurrent active periods for the same member.
