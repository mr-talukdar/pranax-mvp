# Testing Strategy

The repository does not yet contain application test suites. Testing should follow behavior and boundary risk rather than introduce framework-specific infrastructure unnecessarily.

## Planned levels

- Unit tests for isolated business, validation, and data transformation behavior.
- Integration tests for API routes, database boundaries, service calls, and contracts.
- Frontend interaction and accessibility tests for critical user flows.
- Intelligence pipeline tests with fixed and representative fixtures.
- End-to-end tests only for a small set of critical workflows after applications exist.

## Minimum quality

Every change should run relevant formatting, lint, type, and test checks. Security-sensitive and multi-tenant changes require explicit isolation and authorization coverage.

## Test results

Report commands run, environment scope, pass/fail state, and unresolved failures in the task completion report.
