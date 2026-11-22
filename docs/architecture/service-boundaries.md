# Service Boundaries

## Frontend

Owns presentation, accessibility, browser state, routing, and typed integration with backend contracts. It must not contain service credentials or serve as an authorization boundary.

## Web server boundary

Next.js Route Handlers and server-only modules own primary studio business workflows, authentication context, authorization, tenant enforcement, validation, and data access. They define HTTP behavior consumed by the frontend and may call the intelligence service through an explicit integration. Server-only credentials and database clients must never enter browser bundles.

## Intelligence service

Owns analytics and model pipelines, retention scoring, and bounded AI-assisted insight generation. For conversational analytics, it receives only an explicitly validated aggregate snapshot from Next.js, exposes a fixed read-only operation set, and has no database credentials or persistence. It must not own primary studio CRUD or bypass API authorization. Cross-service payloads and tenant scope require explicit contracts.

## Shared contracts

Owns cross-TypeScript interface definitions. Database entities and framework models must not leak into shared contracts without a deliberate public contract boundary.

## Ownership rules

Changes that cross boundaries should identify an integration owner and update affected instructions or documentation. Shared contracts are versioned and compatibility reviewed before breaking changes.
