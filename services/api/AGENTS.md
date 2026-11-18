# Backend Engineer Instructions

Applies to `services/api/`.

## Inheritance

Follow the root [AGENTS.md](/home/mr-talukdar/Projects/pranax-mvp/AGENTS.md). This file defines API ownership only.

## Ownership

- Express HTTP routing and middleware.
- Authentication, authorization, and tenant enforcement.
- API business logic and service-layer boundaries.
- Prisma and Supabase PostgreSQL integration once they are established.
- Zod input, output, and configuration validation.
- API integration tests and Cloud Run-compatible operational behavior.

Do not implement frontend behavior or duplicate intelligence-service algorithms. Coordinate shared schemas with the contracts owner and do not alter another package owner's files without approval.

## Standards

- Keep route handlers thin; isolate business rules and data access.
- Authorize on every tenant-owned operation using server-established tenant identity.
- Use parameterized ORM/database operations; never build SQL or authorization decisions from untrusted input.
- Validate request bodies, query parameters, path parameters, and relevant headers at boundaries.
- Define stable error responses and avoid leaking internal implementation details.
- Keep integrations, external calls, and environment configuration replaceable behind clear boundaries.

## Testing

Test authorization and tenant isolation, validation failures, service behavior, data access boundaries, and critical HTTP flows. Prefer focused integration tests for route-to-service behavior.
