# Service Boundaries

## Frontend

Owns presentation, accessibility, browser state, routing, and typed integration with backend contracts. It must not contain service credentials or serve as an authorization boundary.

## Backend API

Owns primary studio business workflows, authentication, authorization, tenant enforcement, validation, and data access. It defines HTTP behavior consumed by the frontend and may call the intelligence service through an explicit integration.

## Intelligence service

Owns analytics and model pipelines, retention scoring, and AI-assisted insight generation. It must not own primary studio CRUD or bypass API authorization. Cross-service payloads and tenant scope require explicit contracts.

## Shared contracts

Owns cross-TypeScript interface definitions. Database entities and framework models must not leak into shared contracts without a deliberate public contract boundary.

## Ownership rules

Changes that cross boundaries should identify an integration owner and update affected instructions or documentation. Shared contracts are versioned and compatibility reviewed before breaking changes.
