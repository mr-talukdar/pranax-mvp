# Multi-Tenancy

PranaX operates as a multi-tenant SaaS platform where all operational data is partitioned by studio (`studioId`).

## Core Invariant

Every server-side operation over tenant-owned data must establish a trusted tenant scope and enforce it independent of client-provided UI state. Client-supplied tenant IDs are never trusted on their own.

## Tenancy Implementation

1. **Authentication & Identity:**
   - Handled via Supabase Auth SSR session cookies.
   - User identity (`auth.uid()`) is verified server-side on every request.
2. **Studio Authorization:**
   - Verified through the `StudioUser` junction model (`OWNER` and `MANAGER` roles).
   - An active studio cookie (`active_studio_id`) stores the user's active studio preference, but is strictly verified against `StudioUser` records before granting access.
3. **Database Enforcement:**
   - Tenant isolation is enforced inside `withVerifiedStudioContext(authUserId, studioId, tx)`.
   - All Prisma queries explicitly filter by `studioId`.
   - PostgreSQL Row-Level Security (RLS) is enabled with `FORCE ROW LEVEL SECURITY` on tenant-owned tables as defense in depth, paired with session-local `app.studio_id`.
4. **Intelligence Service Boundary:**
   - The FastAPI intelligence service has no database connection.
   - Next.js acts as the authorization boundary, projecting and sending only tenant-authorized evidence or bounded aggregate metrics over an authenticated service token channel (`INTELLIGENCE_SERVICE_TOKEN`).

## Architectural Decisions

- [ADR-001: Next.js Backend & Database Architecture](ADR-001-application-backend-and-database.md)
- [ADR-003: Public Onboarding & Studio Authentication](../decisions/ADR-003-public-onboarding-and-auth.md)
- [ADR-004: Owner Dashboard Backend Data Layer](../decisions/ADR-004-owner-dashboard-data-layer.md)
- [ADR-005: Guarded Studio Analytics Assistant](../decisions/ADR-005-conversational-assistant.md)
