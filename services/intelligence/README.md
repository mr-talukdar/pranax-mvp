# PranaX intelligence service

This independent FastAPI service owns deterministic retention calculations. It accepts explicitly scoped evidence from the Next.js server boundary and does not access PostgreSQL, Supabase, or persistent storage.

## Local development

The service supports Python 3.12 or later. The repository's verified environment is Python 3.14.4.

```bash
python3 -m venv .venv-intelligence
.venv-intelligence/bin/pip install -e 'services/intelligence[test]'
.venv-intelligence/bin/pytest services/intelligence/tests -q
INTELLIGENCE_SERVICE_TOKEN='<shared-random-secret-of-at-least-32-characters>' \
  .venv-intelligence/bin/uvicorn pranax_intelligence.main:app \
  --app-dir services/intelligence/src --port 8000
```

`GET /health` remains unauthenticated for service health checks. `POST /api/v1/retention/assess` requires `Authorization: Bearer <INTELLIGENCE_SERVICE_TOKEN>`. The same server-only value must be configured for the Next.js application. Generate it outside the repository, use at least 32 random bytes, and rotate it in both services together. Never put it in a browser bundle or logs.

The assessment response is deterministic for the same request, date, and `retention-v1.0.0` scoring version. It returns an explicit `is_complete` eligibility/coverage flag, evidence, and a single advisory recommendation; completeness is not model confidence. The endpoint does not make membership changes or persist snapshots.

## Input and coverage boundary

The request includes studio and member IDs, the studio IANA timezone, an assessment date, attendance with event and record timestamps, membership periods and pause intervals with record timestamps, explicit attendance coverage, and whether the supplied membership history is complete. The Next.js server sets the studio ID from a verified `StudioContext` and reads all operational evidence under `withVerifiedStudioContext`. Python filters out evidence recorded after the end of the assessment date in the studio timezone. The response includes the as-of lifecycle state and dated churn/reactivation events derived from membership periods.

Attendance coverage is never inferred from attendance rows. The web adapter maps `attendanceCoverageFrom` to the coverage start and the local calendar date of `coverageVerifiedAt` to the verified-through date. This interprets the existing timestamp as a verification of completeness through that local date. The database has no separate verified-through date or gap ledger; that interpretation is an MVP assumption and requires product/data-owner validation. Missing coverage metadata produces a limited result.

## Scoring model `retention-v1.0.0`

Overall configured weights are attendance recency 25%, attendance trend and consistency 35%, membership lifecycle 25%, and historical renewal 15%. Unavailable dimensions are removed and the remaining dimensions are proportionally rescaled to 100%. Final scores use decimal half-up rounding. Categories are Low 0–29, Medium 30–59, and High 60–100. A score is a prioritisation heuristic, not a churn probability.

### Attendance recency

Absolute score bands are 0–14 days: 0; 15–29: 30; 30–44: 65; 45 or more: 100. The optional personal baseline uses the median local-day interval from the prior 120 days, restricted to explicitly verified attendance coverage. Five intervals (six visits) make the baseline reliable; two to four intervals are weak, and fewer are unavailable. Weak/unavailable baselines do not affect score. A reliable baseline can raise, never lower, the absolute score: 1.5× cadence gives 30, 2× gives 65, and 3× gives 100. These baseline evidence and ratio bands are provisional MVP calibration parameters.

### Attendance trend and consistency

The previous 30 calendar days are compared with the most recent 30 calendar days. Decline is `max(0, (previous - recent) / previous * 100)`. Scores are 0%: 0; 1–24%: 20; 25–49%: 45; 50–74%: 70; 75% or more: 100. A zero previous count makes decline unavailable, not zero.

Consistency uses the median interval between visits in the explicitly verified portion of the 90-day baseline immediately before the recent 30-day period and the median interval in the recent 30-day period. It requires six verified baseline visits (five intervals) and two recent visits (one interval). Deterioration is `max(0, (recent median interval - baseline median interval) / baseline median interval * 100)`. Provisional scores are less than 25%: 0; 25–49%: 20; 50–99%: 45; 100–199%: 70; 200% or more: 100. If either component is unavailable, the 60/40 internal weights are rescaled over the available component. These cadence requirements and bands are provisional and need validation against real studio data.

### Membership and renewal

An active period scores days until effective expiry: more than 30: 0; 15–30: 25; 8–14: 50; 0–7: 100. Effective expiry is reconstructed as the original end plus pause durations recorded by the assessment date; a cancellation event recorded by that date uses the effective end. This prevents later pause or cancellation records from changing a historical assessment. A recorded renewal linked to the active period removes expiry risk. A future-effective cancellation remains assessable only until its effective end date; a paused member is excluded.

Lifecycle output derives `ACTIVE`/`PAUSED` from current date ranges and recorded pause intervals. A membership is `EXPIRED` on its effective end date, `LAPSED` for the following 14 days, then `CHURNED` from the first day after grace. A cancellation churns on its effective date once its cancellation record is known. A later membership period after a churn is a `REACTIVATED` episode; the response retains dated churn/reactivation events for every episode. Renewal within grace prevents an expiry churn event.

Historical renewal uses membership periods ending within the calendar rolling year before the assessment date. An opportunity is complete only after the end date and the full 14-day grace interval (`assessment_date > effective_end + 14 days`). Cancelled periods are excluded as separate churn events. At least two completed opportunities are required. Because no risk-score mapping is specified for this rate, the provisional v1 mapping is the rounded non-renewal percentage itself (for example, 50% becomes score 50). This proportional mapping is an explicit MVP assumption and needs validation against real studio data; insufficient evidence makes the dimension unavailable.

### Recommendations

Low risk returns `NO_INTERVENTION`. Medium and High risk return one advisory action with selected supporting indicators. Deterministic trigger precedence is: multiple severe indicators (High only), prolonged absence, membership expiry within 30 days, repeated non-renewals, attendance trend deterioration, then a general check-in. Recommendations never send communications or mutate records.

## Service authentication and limitations

The shared bearer secret is the smallest service-to-service boundary for the current Next.js/FastAPI deployment shape. Next.js remains responsible for user authentication and tenant authorization; the service token authenticates the caller but does not encode tenant claims. Production network isolation, hosted secret delivery, browser Supabase acceptance, and real-user RLS testing are not verified by this implementation.
