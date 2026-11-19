# ADR-001: Next.js Application Backend and Database Architecture

## Status

Accepted for the PranaX MVP foundation.

## Context

PranaX requires a multi-tenant studio operations foundation with Supabase Auth, Supabase PostgreSQL, Prisma, a Next.js frontend, and a separate Python intelligence service.

## Decisions

- Next.js Server Components, Route Handlers, and Server Actions own the application backend.
- Express is not an MVP application backend dependency.
- Prisma Migrate is the sole schema migration authority.
- Supabase CLI owns local infrastructure, Auth, PostgreSQL, and Studio startup.
- Supabase SQL required by application migrations is incorporated into Prisma migration files.
- PostgreSQL RLS is mandatory for tenant-owned tables.
- The normal application runtime uses the Supabase `authenticated` role in request transactions.
- Server-only modules verify Supabase Auth identity and StudioUser membership before data access.
- Browser studio selection is never authorization proof.
- Python FastAPI remains an independent analytical service and must not bypass API or tenant authorization.
- Synthetic data is a separate development/testing pipeline and must not connect directly to PostgreSQL.

## Consequences

- Tenant context must be transaction-scoped and cleared for pooled connections.
- Local Supabase and Prisma migrations must be exercised in the local environment.
- Seed loading is a controlled server-only operation.
- The repository can begin application feature work without a competing Express service or migration history.

## Limitations

Cloud hosting, hosted Supabase credentials, Vercel deployment, and production Auth configuration remain external setup tasks.
