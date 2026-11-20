# Performance recommendations

## Immediate

1. **Resolve the Supabase RLS advisory.** Have the database owner inspect grants and exposure for `public._prisma_migrations`, then choose an appropriate policy or revoke unintended client-role access. The audit did not change production. Recheck the table's RLS state and access behavior after an approved change.
2. **Identify and record the actual frontend URL and hosting platform.** Without it, no user journey or Web Vitals result can be attributed to the deployed application.
3. **Keep scale claims at NOT VALIDATED.** The single health endpoint and quiet monitoring window do not establish 25, 100, or 500 CCU.

## Safe validation plan

1. Create an isolated staging project or database with synthetic tenants and a configuration representative of production. Do not point a benchmark at the production database.
2. Establish the actual user traffic model: requests per user, think time, journey mix, tenant mix, payload sizes, and desired latency/error budget.
3. Establish Supabase database connection limits and pooling mode, Prisma pool behavior, and safe per-instance connection caps. None was available in this read-only audit.
4. Run 25, 100, and 500-user steps against staging, beginning with health and read-only dashboard journeys. Add state-changing flows only with resettable synthetic data and an explicit test plan.
5. Record route-level p50/p95/p99, throughput, 4xx/5xx, cold starts, active instances, CPU, memory, database connections/queueing, and error budgets. Separate service processing time from browser end-to-end latency.
6. Benchmark retention processing against the synthetic dataset locally or in staging. Record input counts, eligibility exclusions, processing time, and resource use separately from analytical correctness.
7. Validate Gemini with a small fixed synthetic prompt set in a non-production environment. Capture model ID, timeouts, token counts, validated JSON output, fallback rate, cost, and current quota/rate limits. Avoid production member data.
8. Re-run the frontend user journeys through Lighthouse in mobile and desktop modes and capture field data separately if real-user monitoring is introduced.

## Optimization opportunities after measurement

- **Cloud Run:** current maximum is two instances. Review autoscaling and resource sizing only after staged tests show saturation. Do not infer CCU from configured concurrency 80.
- **Database:** validate query plans and indexes against representative tenant-scoped workloads; add connection pooling/caps only after observing connection demand. Do not tune against synthetic table totals alone.
- **Analytics:** keep deterministic scoring separate from recommendation generation, and instrument the input assembly, assessment call, persistence, and serialization stages independently.
- **Gemini cost and latency:** retain the deterministic fallback, minimize prompt content to required aggregate metrics, enforce a runtime response schema, and record token usage/timeout/fallback metrics without logging member data.
- **BigQuery:** defer integration until a measured reporting workload requires cross-tenant analytical scans or historical aggregation beyond PostgreSQL's operational role. Define tenant-safe export and retention boundaries first.

## Capacity estimates

No per-tier instance estimate is included because the audit has no representative requests-per-user profile, service saturation test, database connection cap, or measured analytics workload. Current configuration (1 vCPU/1 GiB per instance, maximum 2) is reported as observed infrastructure, not a recommendation or validated capacity. A staging test should derive estimates before any production scaling decision.
