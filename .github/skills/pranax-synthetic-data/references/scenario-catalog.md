# PranaX synthetic scenario catalogue

Each scenario must have a stable identifier, deterministic configuration, expected business records, and focused validation assertions. Scenarios are test fixtures and generation metadata, not operational member attributes.

| ID | Required condition |
| --- | --- |
| `attendance-coverage-60-days` | Exactly 60 days of declared attendance coverage |
| `last-attendance-45-days-ago` | Last attendance is exactly 45 days before the evaluation point |
| `zero-visits-complete-coverage` | Zero visits with explicitly complete coverage |
| `incomplete-attendance-coverage` | Attendance coverage is explicitly incomplete |
| `two-non-renewal-opportunities` | Two completed membership periods end without renewal |
| `renewal-on-grace-day-12` | Renewal occurs on day 12 of the fourteen-day grace period |
| `two-membership-pauses` | One membership period contains two valid pause/resume events |
| `churn-then-reactivation` | A churn event is followed by a later reactivation period |
| `approaching-expiry-confirmed-renewal` | Membership approaches expiry while renewal is confirmed |
| `insufficient-retention-history` | History is insufficient for a full retention assessment |

## Scenario requirements

- Keep each scenario individually selectable and identifiable in the dataset manifest.
- Use fixed seeds and an explicit evaluation date or clock so assertions do not depend on wall-clock time.
- Assert chronology, tenant ownership, referential integrity, local-date conversion, duplicate prevention, and the scenario-specific condition.
- Ensure scenarios do not contradict membership, attendance, coverage, retention, or ML rules.
- Keep scenario labels out of operational records and model features unless a test explicitly verifies that metadata is excluded.
- Treat invalid scenario output as a validation failure; do not repair it silently.

## Recommended assertions

For time-based scenarios, assert exact dates and timestamps in the studio timezone. For lifecycle scenarios, assert ordered periods and events, no overlapping active/paused periods, and preserved history. For retention scenarios, assert the distinction between incomplete data and zero activity, and between deterministic snapshots and ML prediction records.
