---
name: pranax-database-engineering
description: Guides PranaX database design, Prisma and PostgreSQL implementation, migrations, tenant isolation, integrity review, and schema conventions. Adapted from Copilot skill for Antigravity.
---

# PranaX Database Engineering (Antigravity Adapted)

> **Source Attribution:** Adapted from `.github/skills/pranax-database-engineering/SKILL.md` for native Antigravity workspace execution.

Use this skill for database modeling, Prisma client usage, tenant isolation enforcement, and relational integrity.

## Core Rules

1. **Tenant Isolation:**
   - Every tenant-scoped query must execute within `withVerifiedStudioContext(authUserId, studioId, tx)`.
   - All tenant queries must include `studioId: context.studioId`.
   - Never trust a client-supplied studio ID without server-side verification.
2. **Membership Lifecycle Invariants:**
   - A member can exist without an active membership.
   - At most one membership period may be active or paused for a member at any time.
   - Renewals create new periods linked to `renewedFromId`; history is immutable.
   - Pauses adjust `effectiveEndsAt` by elapsed pause days.
3. **Attendance Invariants:**
   - Unique constraint: `@@unique([studioId, memberId, localDate])`.
   - Attendance must reflect the studio's IANA timezone without server UTC drift.
4. **Retention Snapshot Immutability:**
   - Snapshots in `RetentionSnapshot` are append-only.
   - Never overwrite existing historical snapshots.
