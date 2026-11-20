# ADR-004: Owner Dashboard backend data layer and aggregation services

## Status

Accepted for F06 Owner Dashboard.

## Context

The studio Owner Dashboard is the command center for studio owners and managers to assess the operational health of their business within approximately 30 seconds.
The dashboard requires unified aggregation across operational modules:
1. Studio overview (active members, new registrations, attendance check-ins today).
2. Membership breakdown (active, paused, expiring in 7 days, expired).
3. Attendance trends over time (daily zero-filled sequence, local date alignment).
4. Retention risk distribution (Low, Medium, High risk counts and percentages, limited assessments separated).
5. Attention queue (members requiring immediate operational attention with verified, non-fabricated recommendations and key factors).
6. Reserved ML churn prediction slot (feature-flagged).

The dashboard must reflect actual operational database records under verified tenant isolation (`withVerifiedStudioContext`) rather than client-inferred metrics or a separate analytics warehouse engine.

## Decision

1. **Tenant Isolation & Security**:
   - All data fetching and metric computation executes inside `withVerifiedStudioContext(authUserId, studioId, tx)`.
   - The studio identifier is resolved from verified authentication session and context, never trusted from an unverified client parameter alone.
   - All queries filter strictly by `studioId` within the tenant transaction.

2. **Studio Timezone & Local Calendar Date**:
   - The dashboard uses the studio's configured IANA timezone (from `Studio.timezone`, defaulting to `UTC`) to compute the local calendar date `asOfDate`.
   - Attendance today matches unique attendance records where `localDate` equals the studio's local `asOfDate`.
   - Because `AttendanceRecord` schema enforces `@@unique([studioId, memberId, localDate])`, daily attendance counts naturally represent unique member check-ins per day.

3. **Active Membership & Expiration Definitions**:
   - **Active Member**: A member with at least one `MembershipPeriod` where `status === 'ACTIVE'`, `startsAt <= asOfDate`, `effectiveEndsAt >= asOfDate`, `cancelledAt === null || cancelledAt > asOfDate`, and no active `MembershipPause` covering `asOfDate`.
   - **Paused Member**: A member with an active pause or `status === 'PAUSED'` and `effectiveEndsAt >= asOfDate`, who is not already counted as active.
   - **Expiring Memberships**: Active members whose current active period expires within the configured upcoming window (default: next 7 days).
   - **Expired Memberships**: Members whose memberships have expired without subsequent active renewals.
   - Statuses are prioritized (Active > Paused > Expired) to prevent double-counting.

4. **Attendance Trends Sequence**:
   - The daily attendance trends sequence covers a configurable window (default: 14 days ending on `asOfDate`).
   - Every day in the range is zero-filled if no check-ins exist, providing an unbroken time series for UI charts.

5. **Retention Deduplication & Attention Queue**:
   - Counts and attention items query `RetentionSnapshot` and deduplicate to the **latest valid assessment per eligible member** (ordered by `snapshotDate DESC, createdAt DESC`).
   - Full-score categories (LOW, MEDIUM, HIGH) exclude limited/incomplete assessments, which are counted in a separate `limitedCount` bucket.
   - The Attention Queue prioritizes HIGH risk members, followed by MEDIUM and LIMITED members requiring attention, sorted by category weight, score descending, and recency/absence days.
   - Recommendations and key factors are sourced directly from verified assessment snapshot records; no placeholder or fabricated recommendations are created.

6. **Shared Zod Contracts & API**:
   - Contracts are defined in `packages/contracts/src/dashboard.ts` and exported from `@pranax/contracts`.
   - Route handler is mounted at `GET /api/dashboard`, accepting optional query parameters (`asOfDate`, `registrationWindowDays`, `upcomingExpirationDays`, `trendDays`, `trendInterval`).
   - Next.js server components can directly invoke `getDashboardSummary` on the server or hydrate via `fetchDashboardData()` on the client.

## Consequences

- Dashboard aggregates stay synchronized with live operational data without requiring duplicate ingestion pipelines or external synchronization delays.
- Timezone shifts are properly handled without skewing daily check-in counts.
- Client applications can consume the verified contracts and types with compile-time safety and runtime validation.
