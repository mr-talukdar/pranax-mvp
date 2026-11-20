# PranaX Performance Benchmark

**Assessment date:** 21 November 2026 (Asia/Kolkata)  
**Environment:** live Cloud Run API and Supabase project; local repository dataset and tests  
**Readiness:** the public health endpoint and deployment are verified. Frontend performance, authenticated analytics, Gemini behavior, and all capacity tiers remain unvalidated.

## Executive summary

The active deployment inspected here contains one Cloud Run service, `pranax-intelligence`, in `asia-south1`. Its public `GET /health` endpoint returned HTTP 200 in 20 of 20 sequential requests. End-to-end request time from the audit runner averaged 162.96 ms (median 161.89 ms; maximum 179.26 ms). These are low-volume probe timings, not production user experience or capacity results. Cloud Monitoring reported 53 successful requests in the one-hour window and a weighted service request latency of about 6.36 ms; this includes this audit's requests and is not an isolated benchmark.

The active Supabase project is healthy in `ap-northeast-1`. A scoped, count-only query for the synthetic studio matched the current v1.3.0 dataset: 350 members, 1,318 membership periods, and 20,882 attendance records. No member fields were read. The database contains 234 retention snapshots, which are not in that dataset manifest; snapshot contents were not inspected.

The repository has a Next.js 15 web app, but no live frontend URL or frontend deployment was discoverable from the repository or active Cloud Run service list. Therefore no Lighthouse, Web Vitals, page journey, JavaScript transfer-size, or screenshot evidence for the user interface could be collected. The intelligence assessment endpoint is token-protected. It was not called because an assessment can persist a snapshot through the web application and no dedicated test member or authorized credential was supplied. Gemini generation was not triggered.

Cloud Run is configured for 1 vCPU, 1 GiB memory, request concurrency 80, a 300-second timeout, and up to 2 instances. Minimum instances are not explicitly configured. The configured request slots are not evidence of concurrent-user capacity. **25, 100, and 500 CCU are all NOT VALIDATED.**

The Supabase project inspection surfaced a critical advisory: RLS is disabled on `public._prisma_migrations`. No production changes were made. Review the detailed report and recommendations before treating this deployment as ready for real tenant data.

## Deliverables

- [Full technical report](performance-report.md)
- [Machine-readable results](benchmark-results.json)
- [Verified architecture](architecture.md)
- [Recommendations](recommendations.md)
- Evidence and charts in [evidence/](evidence/)

  - [API latency chart](evidence/charts/api-latency.svg)
  - [Frontend performance chart](evidence/charts/frontend-performance.svg)
  - [Retention processing chart](evidence/charts/processing-time.svg)
  - [Gemini latency chart](evidence/charts/gemini-latency.svg)
  - [Cloud Run resource chart](evidence/charts/resource-utilization.svg)

## Deck summary

PranaX has a live, healthy Cloud Run intelligence health endpoint and a healthy Supabase project. A safe 20-request probe averaged 163 ms end-to-end, while Cloud Run recorded approximately 6.36 ms average service latency across 53 successful requests in the observation window. The 350-member / 1,318-membership / 20,882-attendance synthetic dataset is confirmed in the database. Frontend, authenticated analytics, Gemini, tenant-isolation behavior, and 25/100/500-user capacity have not been validated. Production sizing cannot be inferred from this sample. A critical Supabase RLS advisory on the migrations table remains unresolved.
