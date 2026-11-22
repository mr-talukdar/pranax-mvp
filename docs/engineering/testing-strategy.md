# Testing Strategy

PranaX applies automated tests across behavior, tenant isolation, and boundary risk.

## Test Levels and Coverage

### 1. Unit Tests

- **Shared Contracts (`packages/contracts`):** Zod schema validation, dashboard contracts, assistant contracts, members, attendance, and retention payloads.
- **Python Intelligence Service (`services/intelligence/tests`):** Comprehensive unit tests covering retention scoring mathematics, eligibility boundaries, recency scoring, trend velocity, baseline cadence deterioration, renewal rates, weight redistribution, deterministic recommendation precedence, and assistant intent routing.
- **Synthetic Data (`tools/synthetic-data/tests`):** Deterministic generator validation, reproducible seeds, scenario coverage, and export validation.

### 2. Integration Tests

- **Database Layer (`packages/database`):** Prisma schema validation, migration status, tenant context helper (`withVerifiedStudioContext`), and seed loader verification.
- **Server Services & Route Handlers (`apps/web`):**
  - Member management operations (`members.test.ts`).
  - Attendance check-in and import handling (`attendance.test.ts`).
  - Membership lifecycle operations (`memberships.test.ts`).
  - Dashboard metrics aggregation (`dashboard.test.ts`).
  - Retention calculation service integration (`retention.test.ts`, `retentionRecommendation.test.ts`).
  - Studio bootstrapping and tenant auth context (`context.test.ts`, `bootstrap.integration.test.ts`).

### 3. Tenant Isolation & Security Tests

- Multi-tenant boundary checks ensuring cross-tenant reads and mutations are denied or affect zero rows.
- Verification that client-supplied studio IDs cannot override verified session identity.

## Quality Commands

```bash
# Typecheck
pnpm typecheck

# Linting
pnpm lint

# TypeScript package & application tests
pnpm test

# Synthetic data generator test suite
python3 -m pytest tools/synthetic-data/tests -q

# Intelligence service test suite
python3 -m pytest services/intelligence/tests -q
```

## Test Reporting

Every change reports commands run, scope, pass/fail status, and any unresolved issues in the completion report.
