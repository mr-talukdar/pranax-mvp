# System Overview

PranaX is planned as a multi-tenant SaaS platform for boutique fitness studios.

## Planned components

- **Web application:** Next.js and TypeScript, deployed to a Vercel-compatible frontend project.
- **Application server boundary:** Next.js Route Handlers and server-only TypeScript modules in `apps/web`, deployed with the web application.
- **Intelligence service:** Python and FastAPI for analytics, retention scoring, and AI-assisted insights.
- **Shared contracts:** TypeScript API contracts and schemas consumed across TypeScript boundaries.
- **Data platform:** Supabase PostgreSQL with Prisma. The initial Prisma schema and migration live in `packages/database`; remote Supabase configuration remains environment-dependent.
- **Synthetic data:** A standalone Python factory under `tools/synthetic-data` exports versioned artifacts. The TypeScript seed loader is the only database-facing loader for those artifacts.

## Data flow

Browser clients communicate with the Next.js web application. Server-only modules own the application authorization context and primary data access for the current foundation. The intelligence service receives explicitly authorized data or requests for analytics and AI operations. Synthetic artifacts flow through the database package seed loader before operational storage. External AI and provider integrations remain outside application data boundaries unless individually documented.

## Architecture decisions

- [Next.js application backend and database architecture](ADR-001-application-backend-and-database.md)
- [Deterministic retention service boundary](../decisions/ADR-002-retention-service-boundary.md)
- [Immutable retention snapshot history](../decisions/ADR-003-retention-snapshot-history.md)

## Deployment status

The initial applications and service skeletons are scaffolded, but deployment configuration and Supabase credentials remain TBD.
