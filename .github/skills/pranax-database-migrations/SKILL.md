---
name: pranax-database-migrations
description: Guides Prisma Migrate authority, Supabase CLI local infrastructure, clean migration baselines, migration deployment, drift checks, rollback, and recovery for PranaX.
---

# PranaX database migrations

Use this skill for database schema changes and local Supabase infrastructure.

## Ownership

- Prisma Migrate owns application schema migrations under `packages/database/prisma/migrations/`.
- Supabase CLI owns local PostgreSQL, Auth, Studio, and infrastructure startup.
- Supabase-specific SQL belongs in Prisma migration files.
- Do not maintain a competing `supabase/migrations/` schema history.
- Do not use `supabase db push` or `prisma db push` for versioned application changes.

## Workflow

1. Start local Supabase.
2. Create or edit the Prisma schema.
3. Generate a migration with Prisma Migrate.
4. Inspect generated SQL and PostgreSQL-specific constraints.
5. Apply it to an empty database.
6. Verify migration status and drift.
7. Add runtime constraints and RLS tests.
8. Deploy with `prisma migrate deploy` only after controlled review.

## Safety

- Do not apply migrations to hosted databases without explicit authorization.
- Document data backfills and rollback steps.
- Never replace a known-broken baseline silently when no deployed database exists.
- Stop and report when Docker, Supabase CLI, or credentials are unavailable.
