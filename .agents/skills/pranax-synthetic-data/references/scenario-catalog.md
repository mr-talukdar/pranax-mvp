# PranaX Synthetic Scenario Catalogue (Antigravity Adapted)

> **Source Attribution:** Adapted from `.github/skills/pranax-synthetic-data/references/scenario-catalog.md`.

Each scenario has a stable identifier, deterministic configuration, expected business records, and focused validation assertions.

| Scenario ID | Required Condition & Domain Invariant | Target Behavior |
| :--- | :--- | :--- |
| `attendance-coverage-60-days` | Exactly 60 days of declared attendance coverage | Validates 60-day window threshold in retention engine |
| `last-attendance-45-days-ago` | Last attendance occurred exactly 45 days before evaluation date | Evaluates recency decay curve |
| `zero-visits-complete-coverage` | Verified complete coverage with exactly zero attendance check-ins | Validates that zero visits is distinct from missing data |
| `incomplete-attendance-coverage`| Attendance coverage is explicitly incomplete (`complete: false`) | Triggers LIMITED assessment status |
| `two-non-renewal-opportunities` | Two completed membership periods end without renewal | Evaluates non-renewal penalty |
| `renewal-on-grace-day-12` | Renewal occurs on day 12 of the 14-day grace window | Validates grace-period renewal tracking |
| `two-membership-pauses` | One membership period contains two valid pause/resume events | Validates pause accumulation |
| `churn-then-reactivation` | Cancellation event followed by 31-day gap, then new active period | Validates multi-episode churn/reactivation |
| `approaching-expiry-confirmed-renewal` | Active period expires in $\le 7$ days but renewal is confirmed | Validates that confirmed renewal clears expiry risk |
| `insufficient-retention-history` | Membership/attendance history is insufficient for assessment | Validates LIMITED / EXCLUDED assessment handling |
