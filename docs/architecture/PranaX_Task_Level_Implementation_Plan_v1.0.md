# PranaX MVP — Task-Level Implementation Plan

**Team:** GeneriX  
**Product:** PranaX  
**Plan version:** 1.0  
**Planning horizon:** 24-hour Buildathon sprint  
**Source of truth:** PranaX MVP Product & Engineering Specification v1.0  
**Status:** Product scope frozen; implementation plan

---

## 1. Purpose

This plan converts the frozen PranaX MVP scope into an executable engineering backlog with task ownership, dependencies, priorities, acceptance criteria and a 24-hour delivery sequence.

The goal is not to build six disconnected feature demonstrations. The goal is to deliver one coherent workflow:

> Register a member → record/import attendance → identify engagement deterioration → calculate explainable retention risk → recommend an action → show the result on the studio dashboard.

Machine learning and Conversational Intelligence are included in the product direction, but they must not put the core workflow at risk.

## 2. Delivery Strategy

### 2.1 Buildathon delivery target

**Must work end-to-end:**
1. Studio-aware authentication or a controlled demo tenant.
2. Member registration and directory.
3. Membership assignment and essential lifecycle operations.
4. Manual attendance check-in.
5. CSV attendance import, if time permits after manual check-in is stable.
6. Deterministic retention assessment.
7. One recommendation for Medium and High risk members.
8. Owner dashboard with real data from the operational modules.
9. A polished, repeatable demonstration.

**Should work if time permits:**
- Attendance history and engagement trends.
- Membership pause/resume and cancellation edge cases.
- Assessment history.
- Gemini explanation using structured retention evidence.

**Demonstration-only or deferred behind a feature flag:**
- Production Churn ML.
- Conversational Intelligence beyond a small controlled read-only demo.
- Advanced analytics and visualisations.

A module being in the frozen product scope does not mean every production capability must be completed in the 24-hour sprint. Protect the core workflow first.

### 2.2 Priority definitions

| Priority | Meaning |
|---|---|
| P0 | Required for the end-to-end Buildathon workflow |
| P1 | Important supporting functionality |
| P2 | Valuable polish or secondary workflow |
| P3 | Optional demonstration or post-Buildathon foundation |

### 2.3 Scope protection rules

- Do not add features outside the frozen specification during the sprint.
- Do not build payment processing, scheduling, instructor management or member-facing applications.
- Do not introduce new infrastructure unless a demonstrated blocker requires it.
- Do not make Gemini or ML a dependency of core operations.
- Prefer a working vertical slice over several incomplete screens.
- Use demo data only when clearly identified as demo data.
- Do not represent synthetic-data ML metrics as production performance.

---

## 3. Team Ownership

Ownership below follows the team's stated strengths. The engineering lead retains final responsibility for integration and technical decisions.

| Person | Primary responsibility | Secondary responsibility |
|---|---|---|
| Rahul | Engineering lead, backend, database, integrations, retention logic and deployment | Integration, code review, end-to-end testing |
| Akash | Product design, UX flows, frontend implementation and visual consistency | Demo experience and usability testing |
| Sagnik | Business strategy, studio workflows, product validation and GTM narrative | Acceptance testing, demo script and presentation |
| All | Daily integration, blocker resolution and final rehearsal | Cross-functional review |

### Working agreements

1. Every task has one directly responsible owner.
2. Keep pull requests small and integrate continuously.
3. Do not work in parallel on the same files without coordination.
4. Agree on API contracts and data shapes before frontend/backend work proceeds independently.
5. Rahul owns technical integration and resolves conflicting implementation decisions.
6. Akash owns interaction design and frontend consistency.
7. Sagnik validates that workflows make sense to an actual studio owner or manager.
8. If a task threatens the core workflow, cut or defer it rather than delaying integration.

---

## 4. Critical Path

The critical path is:

```text
Project and environment verification
            |
            v
Tenant/authentication context
            |
            v
Database and application contracts
            |
            v
Member and membership operations
            |
            v
Attendance recording
            |
            v
Attendance indicators
            |
            v
Deterministic retention engine
            |
            v
Owner dashboard and attention queue
            |
            v
End-to-end testing and demo rehearsal
```

CSV import, Gemini and ML are parallel or optional workstreams after the critical path is safe.

---

# 5. Task Backlog

## Phase 0 — Sprint Setup and Integration Contract

**Priority:** P0  
**Suggested timebox:** 45 minutes  
**Lead:** Rahul  
**Support:** Akash, Sagnik

### SET-01 — Verify repository and runtime

**Owner:** Rahul

Tasks:
- [ ] Pull the latest main branch.
- [ ] Verify the pnpm workspace and package scripts.
- [ ] Verify environment variables are documented.
- [ ] Verify Next.js starts locally.
- [ ] Verify Supabase connection.
- [ ] Verify Prisma can connect and inspect the current schema.
- [ ] Verify Python virtual environment and installed dependencies.
- [ ] Verify FastAPI starts locally if the service already exists.
- [ ] Confirm Git branches and integration workflow.

Acceptance criteria:
- The frontend starts successfully.
- Database connectivity is confirmed.
- Python environment is usable.
- All team members know how to run the project.

### SET-02 — Confirm module contracts

**Owner:** Rahul  
**Support:** Akash

Tasks:
- [ ] Agree on member and membership terminology.
- [ ] Agree on the minimum member fields required by the UI.
- [ ] Agree on attendance input and output shapes.
- [ ] Agree on the retention assessment response shape.
- [ ] Agree on dashboard aggregate requirements.
- [ ] Document API routes or server actions before parallel implementation.
- [ ] Confirm how the authenticated studio/tenant context is resolved.

Acceptance criteria:
- Frontend and backend can work independently against agreed contracts.
- No module invents a competing definition of membership or attendance status.

### SET-03 — Confirm demo journey

**Owner:** Sagnik  
**Support:** Akash, Rahul

Tasks:
- [ ] Define the studio persona and demo scenario.
- [ ] Define the member journey to be demonstrated.
- [ ] Identify which data is preloaded and which data is created live.
- [ ] Agree on the final demo sequence.
- [ ] Ensure all demo figures are internally consistent.

Acceptance criteria:
- The team can explain the product in one sentence.
- The demo shows a complete business workflow rather than disconnected features.

---

## Phase 1 — Application Foundation and Tenant Safety

**Priority:** P0  
**Suggested timebox:** 60–90 minutes  
**Lead:** Rahul  
**Support:** Akash

### FND-01 — Establish studio context

Tasks:
- [ ] Confirm how a signed-in user is associated with a studio.
- [ ] Establish a single server-side method for retrieving the authenticated studio ID.
- [ ] Do not trust a tenant ID supplied directly by the browser.
- [ ] Ensure all member, membership and attendance queries use the authenticated studio context.
- [ ] Add a development/demo tenant path only if real authentication setup is not ready.

Acceptance criteria:
- Requests cannot select another studio by changing a client-supplied identifier.
- All business queries are scoped to the authenticated studio.

### FND-02 — Verify database access controls

Tasks:
- [ ] Review Supabase Row Level Security policies.
- [ ] Confirm browser clients cannot access other tenants' records.
- [ ] Keep service-role credentials server-side only.
- [ ] Confirm Python service access is authenticated and tenant-scoped.
- [ ] Add a basic cross-tenant access test.

Acceptance criteria:
- A user from Studio A cannot read or mutate Studio B data.
- No privileged credential is exposed to frontend code.

### FND-03 — Establish shared application conventions

Tasks:
- [ ] Confirm API error response format.
- [ ] Confirm validation conventions.
- [ ] Confirm loading, empty and error UI states.
- [ ] Confirm date/time handling and studio timezone source.
- [ ] Confirm logging conventions.
- [ ] Confirm formatting and lint commands.

Acceptance criteria:
- The team uses consistent response and error handling.
- Business dates are interpreted in the studio's timezone.

---

## Phase 2 — Member Management

**Priority:** P0  
**Suggested timebox:** 2–3 hours  
**Backend lead:** Rahul  
**Frontend lead:** Akash  
**Workflow validation:** Sagnik

### MEM-01 — Implement member registration

Tasks:
- [ ] Implement the member creation operation.
- [ ] Validate required member fields.
- [ ] Associate the member with the authenticated studio.
- [ ] Prevent accidental cross-tenant association.
- [ ] Return the created member in the agreed response shape.
- [ ] Add success and validation error handling in the UI.

Acceptance criteria:
- An owner or manager can register a member.
- The new member appears in the correct studio directory.
- Required validation is enforced server-side.

### MEM-02 — Implement member directory

Tasks:
- [ ] Fetch studio-scoped members.
- [ ] Display member name and relevant contact information.
- [ ] Add search.
- [ ] Add membership-status filtering where supported by current data.
- [ ] Add loading, empty and error states.
- [ ] Link each row to its member profile.

Acceptance criteria:
- The directory displays only the authenticated studio's members.
- Search and filters return correct results.

### MEM-03 — Implement member profile and editing

Tasks:
- [ ] Fetch a member by ID within the authenticated studio.
- [ ] Display member details.
- [ ] Implement profile editing.
- [ ] Display current membership information.
- [ ] Provide a place for membership and attendance history.
- [ ] Handle missing or inaccessible member IDs safely.

Acceptance criteria:
- An owner or manager can inspect and edit a member.
- A member ID from another studio does not expose that member.

### MEM-04 — Implement predefined membership plans

Tasks:
- [ ] Provide Monthly (30 days), Quarterly (90 days) and Annual (365 days) plan options.
- [ ] Assign a selected plan to a member.
- [ ] Create a distinct membership period.
- [ ] Calculate start and expiry dates consistently.
- [ ] Preserve the previous membership period on renewal.
- [ ] Prevent more than one active membership period per member.

Acceptance criteria:
- A member can be assigned a predefined plan.
- Renewal creates a new period rather than overwriting the old one.
- Membership dates are calculated consistently.

### MEM-05 — Implement essential lifecycle actions

Tasks:
- [ ] Implement renewal.
- [ ] Implement pause and resume.
- [ ] Implement cancellation with an effective date.
- [ ] Implement reactivation as a new membership period.
- [ ] Preserve historical periods and lifecycle events.
- [ ] Ensure pause duration extends membership expiry.
- [ ] Validate that only one active period exists.

Acceptance criteria:
- The core lifecycle actions work without destroying history.
- Invalid lifecycle transitions are rejected.
- Pause/resume date calculations are tested.

**Buildathon cut line:** If time is constrained, prioritise registration, directory, profile and initial membership assignment. Demonstrate other lifecycle actions only after the core workflow is stable.

---

## Phase 3 — Attendance Tracking

**Priority:** P0  
**Suggested timebox:** 2–3 hours  
**Backend lead:** Rahul  
**Frontend lead:** Akash  
**Workflow validation:** Sagnik

### ATT-01 — Implement manual check-in

Tasks:
- [ ] Search for a member in the current studio.
- [ ] Record a check-in timestamp.
- [ ] Derive the studio-local attendance date.
- [ ] Enforce one attendance record per member per local calendar day.
- [ ] Show a warning for paused, expired or cancelled members.
- [ ] Allow check-in despite the warning.
- [ ] Handle duplicate check-in gracefully.

Acceptance criteria:
- A valid member can be checked in.
- A duplicate same-day check-in is rejected.
- Inactive membership produces a warning but does not block attendance.
- Check-in cannot target a member in another studio.

### ATT-02 — Implement attendance history

Tasks:
- [ ] Display studio attendance history.
- [ ] Display member-specific attendance history.
- [ ] Add date filtering if time permits.
- [ ] Preserve attendance when membership status changes.
- [ ] Evaluate membership status at the attendance timestamp where required.

Acceptance criteria:
- Attendance history is visible and tenant-scoped.
- Membership changes do not delete historical attendance.

### ATT-03 — Implement CSV import

**Priority:** P1

Tasks:
- [ ] Provide a downloadable or visible fixed CSV template.
- [ ] Accept member ID, email or phone as identifiers.
- [ ] Require an attendance timestamp.
- [ ] Preview uploaded rows before import.
- [ ] Resolve all provided identifiers and reject conflicts.
- [ ] Reject ambiguous and unknown members.
- [ ] Reject malformed timestamps.
- [ ] Detect duplicates using studio-local date.
- [ ] Import valid rows while reporting invalid rows.
- [ ] Store import summary/history if time permits.

Acceptance criteria:
- Valid rows import successfully.
- Invalid rows include a useful reason.
- Re-importing does not create duplicate attendance.
- Import never creates members implicitly.

### ATT-04 — Implement engagement indicators

Tasks:
- [ ] Calculate last visit.
- [ ] Calculate attendance days in the previous 7 days.
- [ ] Calculate attendance days in the previous 30 days.
- [ ] Calculate total attendance days in the available history.
- [ ] Calculate days since last visit.
- [ ] Calculate weekly attendance frequency.
- [ ] Calculate attendance change between consecutive 30-day periods.
- [ ] Keep missing coverage distinguishable from zero attendance.

Acceptance criteria:
- Indicators are calculated from attendance records, not duplicated manually in the UI.
- Date windows use the studio timezone.
- Missing data is not interpreted as zero attendance.

**Buildathon cut line:** Manual check-in and attendance history are mandatory. CSV import is next. Advanced engagement metrics can be implemented as focused queries or service functions after check-in works.

---

## Phase 4 — Retention Intelligence

**Priority:** P1  
**Suggested timebox:** 3–4 hours for a credible MVP implementation  
**Lead:** Rahul  
**UI support:** Akash  
**Rule validation:** Sagnik

### RET-01 — Establish assessment eligibility

Tasks:
- [ ] Determine the reliable attendance coverage window.
- [ ] Verify at least 60 days of reliable attendance coverage.
- [ ] Verify membership history is known.
- [ ] Exclude paused memberships from active assessment.
- [ ] Exclude members without an active membership from the active risk population.
- [ ] Distinguish complete zero-attendance coverage from missing data.
- [ ] Return a limited assessment when requirements are not met.

Acceptance criteria:
- Ineligible members do not receive a misleading full risk score.
- Limited assessments show available observations and explain missing coverage.

**Important dependency:** The product specification requires reliable attendance coverage, but the MVP must implement a practical way to establish it. For the Buildathon, use an explicit studio attendance-history coverage start date or an equivalent verified import-coverage marker. Do not infer coverage merely from the oldest attendance record.

### RET-02 — Implement attendance recency scoring

Tasks:
- [ ] Calculate days since last visit.
- [ ] Apply base scores: 0–14 days = 0; 15–29 = 30; 30–44 = 65; 45+ = 100.
- [ ] Establish personal baseline only when evidence is sufficient.
- [ ] Classify baseline reliability as reliable, weak or unavailable.
- [ ] Allow a reliable personal baseline to increase risk earlier.
- [ ] Never allow the personal baseline to reduce risk below the absolute inactivity score.
- [ ] Use absolute thresholds when baseline is unavailable.

Acceptance criteria:
- Boundary dates are tested.
- No attendance history is not silently converted into a zero-day inactivity score.
- Personal baseline logic cannot reduce the absolute risk floor.

### RET-03 — Implement attendance trend scoring

Tasks:
- [ ] Calculate attendance days in the previous 30-day period.
- [ ] Calculate attendance days in the recent 30-day period.
- [ ] Calculate percentage decline when the previous period is greater than zero.
- [ ] Map decline to the agreed subscores: 0, 20, 45, 70 or 100.
- [ ] Handle previous-period zero without division errors.
- [ ] Implement consistency deterioration only when sufficient history exists.
- [ ] Mark unavailable components explicitly.
- [ ] Redistribute the internal 60/40 component weight when one component is unavailable.

Acceptance criteria:
- Trend calculations use the correct non-overlapping 30-day windows.
- Undefined percentage decline is not fabricated.
- Component availability is reflected in the dimension score.

### RET-04 — Implement membership lifecycle scoring

Tasks:
- [ ] Calculate days until effective membership expiry.
- [ ] Apply agreed scores: more than 30 days = 0; 15–30 = 25; 8–14 = 50; 0–7 = 100.
- [ ] Remove expiry-related risk when a renewal is confirmed.
- [ ] Keep attendance risk independent.
- [ ] Exclude paused memberships from active assessment.
- [ ] Apply the 14-day grace period to expiry lifecycle classification.
- [ ] Handle future-effective cancellations correctly.

Acceptance criteria:
- Expiry boundary conditions are tested.
- A confirmed renewal removes expiry risk.
- A verbal intention does not remove expiry risk.
- Future-effective cancellation does not create premature churn.

### RET-05 — Implement historical renewal scoring

Tasks:
- [ ] Retrieve completed renewal opportunities in the rolling 12-month window.
- [ ] Exclude opportunities still within the grace period.
- [ ] Count successful renewals and completed non-renewals.
- [ ] Require at least two completed opportunities.
- [ ] Mark the dimension unavailable below the evidence threshold.
- [ ] Keep immediate cancellations separate from failed renewal opportunities.
- [ ] Calculate non-renewal percentage when eligible.

Acceptance criteria:
- Renewal history below the evidence threshold is unavailable, not zero.
- The completed opportunity count is exposed with the score.
- Grace-period cases are not prematurely labelled as non-renewals.

### RET-06 — Implement weighted risk calculation

Tasks:
- [ ] Implement the four dimension weights: 25%, 35%, 25%, 15%.
- [ ] Calculate the weighted score using available dimensions only.
- [ ] Redistribute unavailable dimension weights proportionally.
- [ ] Keep dimension scores and contributing evidence in the result.
- [ ] Apply Low 0–29, Medium 30–59 and High 60–100 categories.
- [ ] Version the scoring rules.
- [ ] Ensure the output is explicitly a prioritisation score, not churn probability.

Acceptance criteria:
- Unit tests cover all dimensions available.
- Unit tests cover one or more unavailable dimensions.
- Scores remain within 0–100.
- The result includes scoring-model version and evidence.

### RET-07 — Implement deterministic recommendations

Tasks:
- [ ] Low risk returns no intervention recommendation.
- [ ] Medium risk returns one preventive recommendation.
- [ ] High risk returns one priority recommendation.
- [ ] Evaluate all applicable triggers.
- [ ] Select one highest-priority applicable recommendation.
- [ ] Attach the evidence and reason.
- [ ] Do not execute any external intervention.

Acceptance criteria:
- Never return multiple primary recommendations.
- Low-risk members do not receive intervention recommendations.
- Recommendations are reproducible for the same input and scoring version.

### RET-08 — Implement assessment refresh and history

Tasks:
- [ ] Recalculate the affected member after attendance events.
- [ ] Recalculate after membership lifecycle events.
- [ ] Add a daily scheduled assessment run.
- [ ] Make event processing idempotent.
- [ ] Store one daily snapshot per eligible member.
- [ ] Store additional snapshots for significant changes.
- [ ] Avoid duplicate snapshots for identical calculations.
- [ ] Preserve dimension scores, evidence, recommendation, completeness, model version and timestamp.
- [ ] Support 30-, 60- and 90-day risk progression queries.

Acceptance criteria:
- Reprocessing an event does not corrupt or duplicate assessment history.
- Historical snapshots are immutable.
- Daily assessment handles time-dependent expiry and inactivity changes.

### RET-09 — Build retention profile and attention queue

**Frontend owner:** Akash

Tasks:
- [ ] Display current risk score and category.
- [ ] Display top contributing factors.
- [ ] Display one recommendation where applicable.
- [ ] Display assessment completeness and coverage.
- [ ] Display last assessment timestamp.
- [ ] Display 30-, 60- and 90-day risk progression where data exists.
- [ ] Add a studio-level list of Medium and High risk members.
- [ ] Add useful empty and limited-assessment states.

Acceptance criteria:
- The owner can understand why a member is flagged without reading the scoring implementation.
- The attention queue is based on stored/current assessments, not hardcoded demo labels.

### RET-10 — Add Gemini explanation (optional)

Tasks:
- [ ] Define a structured evidence payload.
- [ ] Send only the minimum necessary information.
- [ ] Ask Gemini to explain the supplied evidence.
- [ ] Prevent the model from changing scores or categories.
- [ ] Handle unavailable or malformed model responses.
- [ ] Retain deterministic explanation as fallback.

Acceptance criteria:
- Gemini cannot alter authoritative retention results.
- Core retention functionality works with the Gemini key absent or the service unavailable.

**Buildathon cut line:** RET-01 through RET-07 and a usable retention UI are the core differentiator. Assessment history and Gemini explanation follow only after the score and recommendation are correct.

---

## Phase 5 — Owner Dashboard

**Priority:** P2  
**Suggested timebox:** 1.5–2 hours  
**Frontend lead:** Akash  
**Data/API lead:** Rahul  
**Product validation:** Sagnik

### DASH-01 — Implement studio overview

Tasks:
- [ ] Display active member count.
- [ ] Display new registrations for a defined period.
- [ ] Display attendance today.
- [ ] Ensure all metrics use the authenticated studio context.
- [ ] Define the period and timezone used by each metric.

Acceptance criteria:
- Values are derived from actual database records.
- Metric definitions are visible or unambiguous.

### DASH-02 — Implement membership overview

Tasks:
- [ ] Display active memberships.
- [ ] Display paused memberships.
- [ ] Display expiring memberships.
- [ ] Display expired memberships.
- [ ] Define the expiring window consistently, using the dashboard's agreed next-seven-days view.

Acceptance criteria:
- Counts agree with member and membership records.
- Status categories are not double-counted.

### DASH-03 — Implement attendance trends

Tasks:
- [ ] Display daily attendance.
- [ ] Display monthly attendance.
- [ ] Use attendance days, not class-session counts.
- [ ] Use studio-local dates.
- [ ] Handle periods with no records.

Acceptance criteria:
- Dashboard attendance matches attendance history for the same period.

### DASH-04 — Implement retention overview

Tasks:
- [ ] Count Low, Medium and High risk members.
- [ ] Exclude limited assessments from full-score category counts.
- [ ] Display the number of limited assessments separately if useful.
- [ ] Ensure counts use the latest valid assessment per eligible member.

Acceptance criteria:
- Dashboard risk distribution matches the retention assessment data.

### DASH-05 — Implement attention queue

Tasks:
- [ ] List members with Medium and High risk.
- [ ] Display score and category.
- [ ] Display main contributing indicator.
- [ ] Display the single recommended action.
- [ ] Link to the member retention profile.
- [ ] Sort by risk and recommendation priority.

Acceptance criteria:
- The owner can move from dashboard to the relevant member record.
- The queue contains no fabricated recommendations.

### DASH-06 — Add ML display slot (feature-flagged)

Tasks:
- [ ] Reserve a dashboard location for validated ML predictions.
- [ ] Hide the section when no validated model is active.
- [ ] Never label experimental synthetic-data results as production predictions.

Acceptance criteria:
- Dashboard works normally when ML is unavailable or disabled.

**Buildathon cut line:** A compact dashboard with real member, attendance and retention counts is sufficient. Do not spend time building a custom analytics framework.

---

## Phase 6 — Churn ML Foundation

**Priority:** P3  
**Suggested timebox:** Post-core workflow; optional Buildathon demonstration  
**Lead:** Rahul

### ML-01 — Define label generation

Tasks:
- [ ] Implement the agreed churn outcome definitions.
- [ ] Apply the 14-day grace period.
- [ ] Separate immediate cancellation from expiry non-renewal.
- [ ] Exclude paused and ambiguous outcomes.
- [ ] Ensure labels have fully matured before training.

Acceptance criteria:
- Each training label can be traced to a valid historical outcome.
- No future information is used as a feature.

### ML-02 — Build feature preparation

Tasks:
- [ ] Generate attendance features.
- [ ] Generate membership features.
- [ ] Generate renewal-history features.
- [ ] Use only information available at the prediction timestamp.
- [ ] Record the feature extraction period.
- [ ] Test for target leakage.

Acceptance criteria:
- Feature generation is repeatable.
- Future attendance or outcomes cannot leak into historical feature rows.

### ML-03 — Train baseline and challenger

Tasks:
- [ ] Train Logistic Regression baseline.
- [ ] Evaluate a Random Forest challenger.
- [ ] Use time-based train/validation/test splits.
- [ ] Calculate precision, recall and PR-AUC.
- [ ] Evaluate probability calibration.
- [ ] Compare with a simple baseline and rule-based Retention Intelligence.

Acceptance criteria:
- Evaluation report is reproducible.
- Synthetic data is clearly labelled and not treated as real validation.

### ML-04 — Model versioning and promotion

Tasks:
- [ ] Store model version and training period.
- [ ] Store evaluation metrics.
- [ ] Define model promotion criteria.
- [ ] Retain a previous valid model for rollback.
- [ ] Keep production prediction disabled until validation and data permission requirements are satisfied.

Acceptance criteria:
- An unvalidated model cannot become the production model.

### ML-05 — Daily prediction generation

Tasks:
- [ ] Generate predictions for eligible active, non-paused members.
- [ ] Store probability, horizon, model version and timestamp.
- [ ] Enforce tenant-scoped reads and writes.
- [ ] Keep predictions separate from rule-based retention scores.

Acceptance criteria:
- Predictions can be traced to a model version and prediction timestamp.
- ML failure does not affect Retention Intelligence.

**Buildathon cut line:** Do not build a production ML pipeline at the expense of the operational workflow. A documented pipeline and clearly labelled offline experiment are enough for the sprint.

---

## Phase 7 — Conversational Intelligence

**Priority:** P4  
**Suggested timebox:** Optional, only after the core workflow is stable  
**Lead:** Rahul  
**Frontend support:** Akash  
**Use-case validation:** Sagnik

### CONV-01 — Define approved read-only operations

Tasks:
- [x] List supported member queries (aggregate studio overview only; no individual-member lookup).
- [x] List supported attendance queries (14-day attendance summary).
- [x] List supported membership queries (aggregate membership status and upcoming expirations).
- [x] List supported retention queries (aggregate risk categories and limited assessments).
- [x] Include ML queries only when validated (none are exposed).
- [x] Define input validation and tenant-scoping for every operation.

Acceptance criteria:
- Every model-callable operation is predefined and read-only.
- No arbitrary SQL execution exists.

### CONV-02 — Implement Gemini orchestration

Tasks:
- [x] Authenticate the user before tool execution.
- [x] Establish tenant context server-side.
- [x] Pass a minimal request to Gemini.
- [x] Allow selection only from approved operations.
- [x] Execute operations server-side.
- [x] Return grounded results to Gemini for explanation.
- [x] Handle missing data and model errors.

Acceptance criteria:
- Gemini cannot access unrestricted database credentials.
- Every returned fact is grounded in an approved operation.

### CONV-03 — Implement conversational UI

Tasks:
- [x] Add a simple chat interface.
- [x] Support follow-up questions within the current session.
- [x] Show loading and error states.
- [x] Render grounded evidence alongside assistant answers.
- [x] Clearly indicate when information is unavailable.

Acceptance criteria:
- Owner and manager can ask supported questions about their own studio.
- Cross-tenant data cannot be retrieved.

**Buildathon cut line:** One or two carefully selected read-only questions are enough for an optional demo. Do not build an autonomous agent system.

---

## Phase 8 — Integration, QA and Demo Readiness

**Priority:** P0  
**Suggested timebox:** Reserve the final 2–3 hours  
**Lead:** Rahul  
**UX and demo:** Akash  
**Product acceptance:** Sagnik

### INT-01 — Complete the end-to-end workflow

Tasks:
- [ ] Register a member.
- [ ] Assign a membership.
- [ ] Record or import attendance.
- [ ] Verify engagement indicators.
- [ ] Generate a retention assessment.
- [ ] Verify the risk category and evidence.
- [ ] Verify the recommendation.
- [ ] Confirm the dashboard reflects the same member and assessment.

Acceptance criteria:
- The complete workflow succeeds without manually editing database records during the demo.

### INT-02 — Tenant isolation smoke test

Tasks:
- [ ] Create or use two test studios.
- [ ] Create members in both studios.
- [ ] Attempt cross-tenant member lookup.
- [ ] Attempt cross-tenant attendance lookup.
- [ ] Attempt cross-tenant dashboard aggregation.
- [ ] Attempt cross-tenant retention lookup.

Acceptance criteria:
- Every cross-tenant access attempt is denied or returns no accessible record.

### INT-03 — Business-rule regression tests

Tasks:
- [ ] Duplicate same-day attendance.
- [ ] Inactive-member check-in warning.
- [ ] Membership pause and expiry extension.
- [ ] Renewal preserving previous period.
- [ ] Grace-period classification.
- [ ] Future-effective cancellation.
- [ ] Limited retention assessment.
- [ ] Missing renewal dimension and weight redistribution.
- [ ] Risk category boundaries.
- [ ] Single recommendation rule.
- [ ] Idempotent assessment refresh.

Acceptance criteria:
- Critical business rules pass repeatable tests.
- No known critical lifecycle or tenant-isolation defect remains.

### INT-04 — UX and visual QA

**Owner:** Akash

Tasks:
- [ ] Verify navigation between dashboard, members and retention.
- [ ] Verify form validation.
- [ ] Verify loading states.
- [ ] Verify empty states.
- [ ] Verify error states.
- [ ] Verify responsive layout for the demo device.
- [ ] Remove placeholder content that could be mistaken for live data.
- [ ] Check terminology consistency.

Acceptance criteria:
- The demo does not contain broken navigation, dead controls or misleading placeholders.

### INT-05 — Product and demo validation

**Owner:** Sagnik

Tasks:
- [ ] Validate the problem statement and value proposition.
- [ ] Verify the demo story is understandable to a studio owner.
- [ ] Ensure every displayed metric has a defensible definition.
- [ ] Ensure synthetic or demo data is identified where appropriate.
- [ ] Prepare concise explanations of retention scoring.
- [ ] Prepare answers about ML validation and data privacy.
- [ ] Rehearse the demo with the team.

Acceptance criteria:
- The team can explain what PranaX does, how it works and what makes its retention intelligence useful.
- No unsupported claim about churn prediction accuracy is made.

### INT-06 — Release readiness

**Owner:** Rahul

Tasks:
- [ ] Verify production/demo environment variables.
- [ ] Verify database migrations are applied.
- [ ] Verify deployment succeeds.
- [ ] Verify application health.
- [ ] Verify API/service health.
- [ ] Confirm no secrets are committed.
- [ ] Confirm the demo tenant has consistent data.
- [ ] Tag or record the demo commit.
- [ ] Keep a known-good build available.

Acceptance criteria:
- The deployed demo is reachable and the end-to-end workflow works in the deployed environment.

---

# 6. Suggested 24-Hour Sprint Schedule

This is a timebox, not a reason to rush past broken dependencies. Integrate continuously.

| Sprint time | Focus | Primary owners | Exit condition |
|---|---|---|---|
| 00:00–00:45 | Setup, repo verification, contracts, demo story | All | Team can run project; contracts agreed |
| 00:45–02:00 | Tenant context, database access, shared conventions | Rahul | Tenant-scoped requests work |
| 02:00–05:00 | Member registration, directory, profile, membership assignment | Rahul + Akash | Member workflow works |
| 05:00–07:30 | Manual attendance and history | Rahul + Akash | Check-in works and duplicates are blocked |
| 07:30–08:30 | CSV import, if core attendance is stable | Rahul | Valid and invalid rows handled |
| 08:30–12:30 | Retention eligibility, scoring and recommendations | Rahul | Deterministic assessment works |
| 12:30–14:00 | Retention profile and attention queue | Akash + Rahul | Owner can understand risk and action |
| 14:00–16:00 | Owner dashboard | Akash + Rahul | Dashboard shows real module data |
| 16:00–18:00 | Integration and business-rule testing | All | End-to-end workflow passes |
| 18:00–20:00 | UX polish, deployment and demo data | Akash + Rahul | Deployed demo is stable |
| 20:00–22:00 | Optional Gemini or ML demonstration | Rahul | Only if core workflow is stable |
| 22:00–24:00 | Regression, rehearsal, buffer and final release | All | Known-good demo ready |

If the actual available time is shorter, cut optional work in this order:
1. Production ML.
2. Conversational Intelligence.
3. Gemini explanations.
4. CSV import enhancements.
5. Historical assessment charts.
6. Secondary membership lifecycle polish.

Do not cut tenant isolation, member registration, manual attendance, deterministic retention scoring or the final end-to-end test.

---

# 7. Minimum Test Matrix

| Area | Test | Expected result |
|---|---|---|
| Tenant isolation | User requests another studio's member | Denied |
| Member | Register member | Created in current studio |
| Membership | Assign plan | Correct period created |
| Membership | Renew | New period; old period preserved |
| Membership | Pause and resume | Expiry extended by paused duration |
| Attendance | Check in member | Attendance recorded |
| Attendance | Check in same member twice on same local date | Duplicate rejected |
| Attendance | Check in expired member | Warning shown; check-in allowed |
| CSV | Conflicting identifiers | Row rejected with reason |
| CSV | Unknown member | Row rejected |
| CSV | Re-import same row | No duplicate created |
| Retention | Less than 60 days reliable coverage | Limited assessment |
| Retention | Complete coverage with zero visits | Valid inactivity evidence |
| Retention | No renewal history | Renewal dimension unavailable |
| Retention | One completed renewal opportunity | Renewal dimension unavailable |
| Retention | Two completed opportunities | Renewal dimension available |
| Retention | Confirmed early renewal | Expiry-related score removed |
| Retention | Low-risk member | No intervention recommendation |
| Retention | Medium/high-risk member | Exactly one recommendation |
| Assessment | Reprocess same event | No duplicate/corrupt snapshot |
| Dashboard | Compare attendance count | Matches attendance source |
| Dashboard | Compare risk distribution | Matches latest eligible assessments |
| Gemini | Model unavailable | Core product remains functional |
| ML | Model unvalidated | No production probability shown |

---

# 8. Definition of Buildathon Success

The Buildathon MVP is successful when:

- [ ] The application runs in a deployed demo environment.
- [ ] A studio owner or manager can register a member.
- [ ] A membership can be assigned.
- [ ] Attendance can be recorded.
- [ ] The system can identify a member with declining engagement.
- [ ] Retention risk is calculated deterministically.
- [ ] The score is accompanied by understandable evidence.
- [ ] One appropriate recommendation is displayed.
- [ ] The owner dashboard reflects the operational data.
- [ ] Tenant isolation is enforced.
- [ ] The demo can be repeated without manual database intervention.

ML and conversational capabilities can strengthen the presentation, but they are not prerequisites for Buildathon success.

---

# 9. Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Scope expansion | Core workflow unfinished | Enforce frozen scope and cut optional work |
| Database/schema churn | Integration delays | Agree on contracts before parallel work |
| Tenant isolation gaps | Severe data exposure | Server-side tenant context and cross-tenant tests |
| Incomplete attendance coverage | False retention assessments | Explicit coverage marker and limited assessments |
| Scoring edge cases | Misleading risk results | Unit tests for boundaries and missing data |
| Gemini latency/failure | Broken demo | Keep Gemini optional and provide deterministic fallback |
| No real churn dataset | Invalid ML claims | Gate production ML and label synthetic experiments |
| Late integration | Broken deployment | Integrate continuously and reserve final test window |
| Demo data inconsistency | Loss of credibility | Prepare and rehearse one consistent scenario |

---

# 10. Post-Buildathon Backlog

Do not pull these into the 24-hour sprint unless the core product is already stable.

## Product and Operations
- Studio onboarding and self-service tenant setup.
- More robust member deduplication.
- Configurable membership plans.
- More complete lifecycle audit trail.
- Improved attendance import diagnostics.
- Attendance coverage management UI.

## Retention Intelligence
- Validate scoring thresholds with real studio outcomes.
- Calibrate cadence deterioration bands.
- Improve recommendation priority using observed outcomes.
- Add studio-level retention reporting.
- Evaluate scoring fairness across different membership plans.

## Churn ML
- Collect consented, sufficiently mature real-world training data.
- Establish a reproducible historical feature dataset.
- Run temporal validation.
- Calibrate probabilities.
- Monitor model drift and performance.
- Establish retraining and rollback procedures.

## Conversational Intelligence
- Expand approved read-only tools.
- Improve query grounding and citations to studio records.
- Add richer structured responses.
- Evaluate query correctness and tenant isolation.

## Platform
- Production observability.
- Backups and recovery procedures.
- Rate limiting.
- Audit logging.
- Security review.
- Performance testing.
- Privacy and data-retention policies.

---

# 11. Final Execution Rules

1. Ship the vertical slice before optional modules.
2. Keep one source of truth for each business concept.
3. Treat tenant isolation as a release blocker.
4. Keep retention scoring deterministic and testable.
5. Never turn missing data into zero activity.
6. Never claim synthetic ML results are validated.
7. Keep Gemini read-only and optional.
8. Integrate continuously.
9. Reserve time for deployment and rehearsal.
10. Do not reopen frozen product scope during implementation without an explicit team decision.

**The immediate next task is SET-01: verify the repository, runtime, database connection and current implementation state.**

**Buildathon objective: A working studio operations workflow with explainable retention intelligence.**
