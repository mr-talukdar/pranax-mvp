# System Overview

PranaX is a multi-tenant SaaS platform for boutique fitness, Pilates, and yoga studios.

## System Components

- **Web application:** Next.js 15 (App Router, React 19, Tailwind CSS) deployed to a Vercel-compatible project.
- **Application server boundary:** Next.js Route Handlers and server-only TypeScript modules in `apps/web` owning authentication context, studio workspace bootstrapping, tenant enforcement (`withVerifiedStudioContext`), data access via Prisma, and service integrations.
- **Intelligence service:** Python 3.12+ and FastAPI service in `services/intelligence` owning the deterministic retention scoring engine and the guarded conversational studio assistant.
- **Shared contracts:** TypeScript API contracts and Zod schemas in `packages/contracts` (`@pranax/contracts`) consumed across TypeScript boundaries.
- **Data platform:** Supabase PostgreSQL with Prisma ORM in `packages/database` (`@pranax/database`). Includes schema definitions, multi-tenant isolation helpers, migrations, and synthetic seed loader.
- **Synthetic data:** A standalone Python factory under `tools/synthetic-data` exporting reproducible, versioned dataset artifacts (v1.2.0, v1.3.0). The TypeScript seed loader is the sole database-facing loader for these artifacts.

## Data Flow

Browser clients communicate with the Next.js web application. Server-only modules verify authentication identity through Supabase Auth SSR session cookies and enforce studio authorization through `StudioUser` membership.

The intelligence service receives explicitly authorized aggregate data or retention evaluation inputs from the Next.js server boundary via shared secret bearer token authentication (`INTELLIGENCE_SERVICE_TOKEN`). The intelligence service has no database connection and never receives raw PII.

Synthetic artifacts flow through the database package seed loader before operational storage.

## Architecture Decisions

- [Next.js application backend and database architecture](ADR-001-application-backend-and-database.md)
- [Deterministic retention service boundary](../decisions/ADR-002-retention-service-boundary.md)
- [Public onboarding and studio authentication](../decisions/ADR-003-public-onboarding-and-auth.md)
- [Immutable retention snapshot history](../decisions/ADR-003-retention-snapshot-history.md)
- [Owner Dashboard backend data layer and aggregation services](../decisions/ADR-004-owner-dashboard-data-layer.md)
- [Guarded studio analytics assistant](../decisions/ADR-005-conversational-assistant.md)

## Operational Status

- Core MVP modules are implemented and operational: Public Landing, Studio Onboarding & Bootstrap, Owner Dashboard, Member Directory & Profiles, Membership Plans & Lifecycle, Attendance Tracking & CSV Import, Retention Intelligence & Historical Snapshots, and Guarded AI Studio Assistant.
- Remote Supabase integration, Vercel runtime configuration, and demo authentication workflows are active.
