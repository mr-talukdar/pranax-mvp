# ADR-002: Deterministic retention service boundary

## Status

Accepted for the first retention-engine implementation.

## Context

PranaX assigns operational authentication, tenant authorization, and PostgreSQL access to the Next.js server boundary. The Python intelligence service owns pure analytical computation and must not receive database credentials or persist operational state. The current repository has no hosted service identity provider or deployment network policy.

## Decision

- Next.js verifies the Supabase user and StudioUser membership, retrieves a member's evidence under `withVerifiedStudioContext`, and supplies the studio ID from its server-established `StudioContext`.
- Next.js calls FastAPI over a server-only HTTP client using a shared bearer secret named `INTELLIGENCE_SERVICE_TOKEN`.
- FastAPI compares the token in constant time and rejects assessment calls when it is absent or shorter than 32 characters. `/health` remains unauthenticated.
- FastAPI accepts the tenant-scoped evidence, validates it, computes a deterministic response, and performs no persistence.
- The Next.js response contract is validated before returning it to an authorized caller. Snapshot persistence and deduplication remain unimplemented application responsibilities.

## Consequences

- Local deployments configure the same random secret for both services. Rotation requires coordinated updates.
- Compromise of the shared secret permits a caller to submit arbitrary studio-scoped evidence. Tenant authorization therefore remains exclusively in Next.js; the Python service is not an authorization authority.
- The service URL, production network isolation, secret manager, deployment TLS, rate limiting, and automated secret rotation remain deployment decisions and are not verified here.
- The existing `coverageVerifiedAt` field is interpreted by the web adapter as coverage verified through its studio-local date. A dedicated verified-through date and explicit gap representation would be a future data-contract improvement; this implementation does not change the frozen database schema.
