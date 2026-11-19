# PranaX MVP — Design Scope & Stitch Handoff v1.0

**Product:** PranaX  
**Team:** GeneriX  
**Design owner:** Akash  
**Engineering owner:** Rahul  
**Product validation:** Sagnik  
**Design tool:** Google Stitch  
**Status:** Proposed design scope freeze  
**Source of truth:** PranaX MVP Product & Engineering Specification v1.0 and Task-Level Implementation Plan v1.0

---

# 1. Purpose

This document defines the exact design work required for the frozen PranaX MVP.

Akash will use Google Stitch to design the screens and interaction states. The resulting design package will be consumed by the engineering team and coding agents as the visual and interaction reference during implementation.

The objective is to freeze:

1. Which screens must exist.
2. What each screen must display.
3. What actions each screen supports.
4. Which states must be designed.
5. How screens connect.
6. Which reusable components and design tokens must be shared.
7. What artifacts must be handed to engineering.

This is not a request to design every future PranaX feature. It is the design contract for the frozen MVP only.

# 2. Design Principles

## 2.1 One coherent application

Design PranaX as one integrated studio-management SaaS product, not six separate feature microsites.

All screens must share:
- Application shell.
- Navigation.
- Typography.
- Colour system.
- Spacing system.
- Form patterns.
- Table patterns.
- Buttons and actions.
- Feedback and status patterns.

## 2.2 Desktop-first, responsive by default

Primary design target:
- Desktop: 1440 × 900 px.

Also verify:
- Laptop: 1280 × 800 px.
- Tablet: approximately 768 px wide.
- Mobile: approximately 390 px wide.

The MVP is primarily an owner/manager desktop application. Mobile should remain usable for quick member lookup and attendance check-in, but do not design a separate mobile application.

## 2.3 Data density without clutter

Studio owners need to scan information quickly.

Use:
- Clear hierarchy.
- Compact but readable tables.
- Strong status indicators.
- Meaningful whitespace.
- Short explanations.
- Progressive disclosure for detailed information.

Avoid:
- Excessive gradients.
- Too many decorative charts.
- Oversized KPI cards.
- Unnecessary animations.
- AI-themed decoration that does not communicate functionality.

## 2.4 Explainable intelligence

Retention screens must make it clear:
- What the score means.
- Why the member received it.
- Which evidence contributed.
- What action is recommended.
- Whether the assessment is complete or limited.

Never visually imply that the deterministic retention score is a probability of churn.

## 2.5 Realistic product content

Use consistent, realistic demo content across all screens.

Do not use random numbers that contradict each other. The same member must have the same name, membership, attendance and risk information everywhere in the design.

Use clearly identifiable demo data. Do not imply that demo values are live production data.

---

# 3. Navigation and Application Shell

## 3.1 Proposed primary navigation

The left sidebar should contain:

1. Overview
2. Members
3. Attendance
4. Retention
5. AI Assistant (optional/feature-flagged)

A bottom section should contain:
- Studio settings.
- User profile and sign-out.

## 3.2 Global application shell

Every authenticated screen must share:

### Sidebar
- PranaX brand/logo.
- Primary navigation.
- Active navigation state.
- Optional feature availability state for AI Assistant.
- Studio identity or studio switcher if the existing tenancy model supports it.

### Top bar
- Current page title or breadcrumb.
- Contextual primary action where appropriate.
- Notifications only if an actual notification capability exists; otherwise omit.
- User avatar/profile menu.

### Main content
- Consistent page gutters.
- Consistent title and subtitle hierarchy.
- Standard page action placement.
- Standard loading, empty and error patterns.

### Responsive behaviour
- Sidebar collapses or becomes a mobile navigation drawer.
- Tables may become stacked rows/cards or horizontally scroll where appropriate.
- Primary actions remain reachable.
- Forms remain usable without horizontal overflow.

## 3.3 Navigation map

```text
Authenticated Application
|
|-- Overview
|
|-- Members
|   |-- Member Directory
|   |-- Add Member
|   |-- Member Profile
|       |-- Overview tab
|       |-- Membership tab
|       |-- Attendance tab
|       |-- Retention tab
|       |-- Membership action dialogs
|
|-- Attendance
|   |-- Check-in
|   |-- Attendance History
|   |-- CSV Import flow
|       |-- Upload
|       |-- Preview and Validation
|       |-- Import Results
|
|-- Retention
|   |-- Retention Overview / Attention Queue
|   |-- Member Profile (Retention tab)
|
|-- AI Assistant (optional)
|
|-- Studio Settings
```

---

# 4. Screen Inventory

The following is the complete proposed MVP design inventory.

A tab, modal, drawer or wizard step is counted as a design state, not necessarily a separate application route. This avoids creating unnecessary pages.

## Screen 00 — Authentication

**Screen ID:** AUTH-01  
**Priority:** P1, only if the existing authentication experience is not already usable.

### Purpose
Allow an authorised studio owner or manager to sign in.

### Required content
- PranaX branding.
- Email field.
- Password field.
- Sign-in action.
- Validation and error feedback.

### States
- Default.
- Submitting.
- Invalid credentials.
- Required field validation.
- Successful sign-in transition.

### Design note
Do not spend time designing registration, social login or password recovery flows unless they already exist or are required by the current authentication implementation.

---

## Screen 01 — Studio Overview Dashboard

**Screen ID:** DASH-01  
**Priority:** P0

### Purpose
Give the owner or manager a quick view of studio health and what needs attention.

### Required content

#### Page header
- Page title: Overview.
- Current studio context.
- Relevant date or period context.

#### KPI section
- Active members.
- New registrations for the selected period.
- Attendance today.
- High-risk members.
- Memberships expiring in the next 7 days.

#### Membership overview
- Active memberships.
- Paused memberships.
- Expiring memberships.
- Expired memberships.

#### Attendance trends
- Daily attendance.
- Monthly attendance.
- Clear date labels and attendance-day semantics.

#### Retention overview
- Low-risk count.
- Medium-risk count.
- High-risk count.
- Limited assessments count if available.

#### Attention queue
Each row should show:
- Member name.
- Risk category.
- Risk score.
- Main contributing indicator.
- One recommended action.
- Link to member profile.

### Actions
- Add member.
- Record attendance.
- View all members.
- View attendance history.
- View retention queue.
- Open member profile.

### States
- Populated dashboard.
- First-use/empty studio.
- Loading.
- Partial data availability.
- Error.
- ML section hidden when no validated model is active.

### Design constraints
- Dashboard values must look like real product metrics, not decorative mock statistics.
- Do not show a churn probability unless a validated production model is active.
- The dashboard must not include accounting, revenue forecasting or payroll.

---

## Screen 02 — Member Directory

**Screen ID:** MEM-01  
**Priority:** P0

### Purpose
Allow owners and managers to find and manage studio members.

### Required content
- Page title: Members.
- Member count.
- Search field.
- Membership status filter.
- Primary action: Add Member.

### Table columns
- Member.
- Contact information.
- Membership plan.
- Membership status.
- Membership expiry.
- Last visit, if available.
- Row action or profile link.

### Actions
- Search.
- Filter.
- Open member profile.
- Add member.

### States
- Populated directory.
- No members yet.
- No search results.
- Filtered results.
- Loading.
- Error.

### Design constraints
- Keep the table scannable.
- Do not overload the directory with every retention indicator.
- Use consistent membership status badges.

---

## Screen 03 — Add / Edit Member

**Screen ID:** MEM-02  
**Priority:** P0

### Purpose
Create a member or edit an existing member's details.

### Required fields
Use the fields supported by the existing product specification and application implementation. At minimum, design for:
- Full name.
- Email.
- Phone.
- Any additional basic profile fields already agreed by the engineering team.

### Actions
- Save member.
- Cancel.
- Return to directory.

### States
- Create mode.
- Edit mode.
- Validation errors.
- Saving.
- Success.
- Server error.

### Design note
Use one reusable form design for create and edit. Do not create two visually different experiences.

Membership assignment may be offered as the next step after registration, but do not make payment collection part of this form.

---

## Screen 04 — Member Profile

**Screen ID:** MEM-03  
**Priority:** P0

### Purpose
Provide a single source of context for an individual member.

### Header
- Member name.
- Contact details.
- Current membership status.
- Primary action appropriate to the current state.

### Tabs

#### Tab A: Overview
- Member details.
- Current membership summary.
- Last visit.
- Attendance summary.
- Current retention status when available.

#### Tab B: Membership
- Current membership period.
- Plan.
- Start date.
- Expiry date.
- Membership history timeline.
- Lifecycle actions.

#### Tab C: Attendance
- Total attendance days.
- Last visit.
- Attendance days in recent periods.
- Attendance history list.

#### Tab D: Retention
- Current risk score and category.
- Assessment completeness.
- Top contributing indicators.
- One recommendation when applicable.
- Last assessment timestamp.
- 30-, 60- and 90-day risk progression where history exists.
- ML prediction only when validated and enabled.

### States
- Active membership.
- Paused membership.
- Expired membership.
- Cancelled membership.
- Limited retention assessment.
- No retention assessment yet.
- No attendance history.
- Loading and error.

### Design constraints
- Do not create a separate disconnected retention profile page if the member profile Retention tab can serve the purpose.
- Make the current membership state obvious.
- Preserve historical context.

---

## Screen 05 — Membership Action Dialogs

**Screen ID:** MEM-04  
**Priority:** P0/P1

These are modal or drawer states launched from the Member Profile. They are not separate navigation pages.

### Required action states

#### Assign membership
- Select predefined plan.
- Select or confirm start date.
- Show calculated duration and expiry.
- Confirm assignment.

#### Renew membership
- Select predefined plan.
- Show new membership period.
- Explain that previous membership history is preserved.
- Confirm renewal.

#### Pause membership
- Capture pause start and expected end or duration according to the implementation contract.
- Explain that expiry is extended by actual paused duration.
- Confirm pause.

#### Resume membership
- Show pause information.
- Confirm resume.
- Show resulting expiry calculation where available.

#### Cancel membership
- Capture effective cancellation date.
- Clearly distinguish immediate from future-effective cancellation.
- Confirm cancellation.

#### Reactivate membership
- Explain that reactivation creates a new membership period.
- Select predefined plan.
- Confirm reactivation.

### Shared states
- Confirmation.
- Validation error.
- Processing.
- Success.
- Failure.

### Design constraints
- Destructive actions require clear confirmation.
- Do not imply that payment is collected.
- Do not silently overwrite historical membership periods.

---

## Screen 06 — Attendance Check-in

**Screen ID:** ATT-01  
**Priority:** P0

### Purpose
Allow a manager to quickly record a member's visit.

### Required content
- Page title: Attendance / Check-in.
- Member search.
- Search results.
- Selected member summary.
- Current membership status.
- Check-in action.
- Today's recent check-ins.

### Behaviour
- Search members within the current studio.
- Select a member.
- Show a warning if membership is paused, expired or cancelled.
- Allow check-in despite the warning.
- Prevent duplicate attendance on the same studio-local date.

### States
- Initial search.
- Search results.
- No search results.
- Member selected.
- Active membership.
- Inactive membership warning.
- Successful check-in.
- Duplicate check-in.
- Error.

### Design constraints
- Optimise for speed.
- The primary action should be obvious.
- Do not include class or session selection.
- Do not design QR, RFID or biometric flows.

---

## Screen 07 — Attendance History

**Screen ID:** ATT-02  
**Priority:** P1

### Purpose
Allow owners and managers to inspect studio attendance records.

### Required content
- Date range or date filter.
- Search by member.
- Attendance list/table.
- Member name.
- Attendance timestamp.
- Membership state at attendance time where available.

### Actions
- Filter by date.
- Search member.
- Open member profile.
- Open CSV import.

### States
- Populated history.
- No attendance records.
- No results for selected date range.
- Loading.
- Error.

### Design constraints
- Attendance is attendance days, not class-session counts.
- Display dates consistently in the studio timezone.

---

## Screen 08 — CSV Attendance Import Wizard

**Screen ID:** ATT-03  
**Priority:** P1

Design this as one three-step wizard with a clear progress indicator.

### Step 1: Upload

Required content:
- CSV template download.
- Upload area.
- Accepted file guidance.
- Required timestamp and identifier explanation.

### Step 2: Preview and Validation

Required content:
- Row count.
- Valid row count.
- Invalid row count.
- Preview table.
- Row-level validation errors.
- Clear indication of conflicting, ambiguous and unknown member identifiers.
- Import valid rows action.

### Step 3: Import Results

Required content:
- Successfully imported count.
- Rejected count.
- Duplicate count.
- Error summary.
- Link back to attendance history.
- Option to import another file.

### States
- No file selected.
- Uploading.
- Preview ready.
- Validation errors.
- No valid rows.
- Importing.
- Import completed with all rows valid.
- Import completed with partial failures.
- Import failed.

### Design constraints
- Do not design flexible column mapping.
- Do not silently create members.
- Make partial success understandable.
- Make duplicate handling explicit.

---

## Screen 09 — Retention Overview / Attention Queue

**Screen ID:** RET-01  
**Priority:** P1

### Purpose
Give owners and managers a dedicated view of member retention health.

### Required content

#### Summary
- Low-risk members.
- Medium-risk members.
- High-risk members.
- Limited assessments.

#### Member queue
- Member name.
- Risk score.
- Risk category.
- Days since last visit.
- Membership expiry.
- Main contributing factor.
- Primary recommendation.
- Link to member profile.

#### Filters
- Risk category.
- Membership status where relevant.
- Recommendation type if useful.
- Search member.

### States
- Populated queue.
- No Medium/High-risk members.
- Limited assessments present.
- No eligible assessments.
- Loading.
- Error.

### Design constraints
- Do not make the risk score look like a churn probability.
- Make the meaning of Low, Medium and High accessible.
- Show evidence, not just coloured badges.
- Limited assessments must be visually distinct from scored assessments.

---

## Screen 10 — Retention Tab within Member Profile

**Screen ID:** MEM-03 / RETENTION TAB  
**Priority:** P1

This is a tab state within MEM-03, not a separate route.

### Required content
- Current score and category.
- Assessment completeness.
- Dimension-level contributions.
- Top evidence.
- One primary recommendation.
- Last assessment timestamp.
- Historical risk trend.

### Limited assessment state
- Clearly state that a full risk score is unavailable.
- Display available attendance and membership observations.
- Explain what information is missing.

### Design constraints
- Explain that the deterministic score is a prioritisation score, not a probability.
- Distinguish a membership renewal warning from attendance disengagement.
- Do not imply statistical confidence.

---

## Screen 11 — AI Assistant

**Screen ID:** CONV-01  
**Priority:** P3 / Optional demonstration

### Purpose
Allow owners and managers to ask natural-language questions about their own studio.

### Initial state
- Short explanation of supported questions.
- Suggested prompts.
- Message input.

### Conversation state
- User message.
- Assistant response.
- Supporting figures or tables.
- Follow-up input.
- Loading state.

### Suggested prompts
- Which members have not visited in the last 30 days?
- Why is this member marked high risk?
- Which memberships expire this week?
- What should I prioritise today?

### Error and limitation states
- Gemini unavailable.
- Unsupported question.
- Data unavailable.
- No matching members.
- Response generated from available data only.

### Design constraints
- Read-only.
- No arbitrary SQL or write actions.
- No autonomous agent controls.
- No external web search.
- Do not show this navigation item when the optional module is disabled.

---

## Screen 12 — Minimal Studio Settings

**Screen ID:** SET-01  
**Priority:** P1, minimum configuration only

### Purpose
Provide the minimum studio-level configuration needed for correct date handling and attendance coverage.

### Required content
- Studio name.
- Studio timezone.
- Attendance history coverage start date or verified coverage marker.
- Save action.

### Why this screen matters
Retention assessment eligibility requires reliable attendance coverage. The system must distinguish:
- A complete period with zero visits.
- A period for which attendance data is missing or not imported.

The studio needs a clear way to establish the date from which attendance history is considered reliable.

### States
- Initial setup.
- Existing configuration.
- Validation.
- Save success.
- Save failure.

### Design constraints
- Do not expand this into a full settings or administration module.
- Do not design billing, roles, integrations or custom plan configuration.

---

# 5. Explicitly Not Required in the MVP Design

Do not design screens for:

- Payment collection.
- Payment gateway configuration.
- UPI AutoPay.
- GST invoices.
- Accounting.
- Revenue forecasting.
- Payroll.
- Class scheduling.
- Instructor management.
- Equipment booking.
- Waitlists.
- Member mobile app.
- Member self-service portal.
- Automated WhatsApp/email campaigns.
- Lead management.
- Loyalty/rewards.
- Custom analytics report builder.
- Model training administration.
- ML model management console.
- Autonomous AI agents.
- Custom plan builder.
- Granular role permissions.

Churn ML does not require a separate user-facing screen for the MVP. Its validated signal can appear as a clearly separate field within the member Retention tab and dashboard only when enabled.

---

# 6. Shared Design System Deliverables

Akash must create a reusable design system before or alongside the feature screens.

## 6.1 Foundations

Define:
- Brand colour palette.
- Neutral/background palette.
- Semantic colours for success, warning, danger and information.
- Typography family and scale.
- Font weights.
- Spacing scale.
- Border radius scale.
- Shadows/elevation.
- Icon style.
- Grid and page layout.
- Breakpoints.

Do not choose colours independently on each screen.

## 6.2 Required Components

Design reusable variants for:

### Navigation
- Sidebar.
- Active and inactive nav item.
- Collapsed sidebar.
- Mobile navigation drawer.
- Top bar.
- Breadcrumb.

### Actions
- Primary button.
- Secondary button.
- Tertiary/ghost button.
- Destructive button.
- Icon button.
- Disabled/loading button.

### Data display
- KPI card.
- Data table.
- Table row actions.
- Status badge.
- Risk badge.
- Empty state.
- Pagination if required.
- Date display.

### Forms
- Text input.
- Email input.
- Phone input.
- Select.
- Date picker.
- Textarea if required.
- Validation message.
- Form section.
- Form footer/actions.

### Feedback
- Success toast.
- Error toast.
- Warning banner.
- Confirmation dialog.
- Destructive confirmation dialog.
- Loading skeleton.
- Empty state.
- Inline error.

### Intelligence
- Risk score display.
- Risk category indicator.
- Assessment completeness indicator.
- Contributing factor list.
- Recommendation card.
- Risk trend chart.
- Limited assessment panel.

### Import
- File upload dropzone.
- CSV preview table.
- Row validation status.
- Import summary.
- Step indicator.

---

# 7. Interaction and State Design Requirements

A static screenshot is not a complete design.

For each primary screen, Akash must specify the relevant states.

Minimum shared states:
- Default.
- Hover/focus where relevant.
- Loading.
- Empty.
- Validation error.
- Server error.
- Success.
- Disabled.
- Responsive layout.

Feature-specific states must also be designed, particularly:

| Feature | Critical states |
|---|---|
| Member Management | Create, edit, active, paused, expired, cancelled |
| Membership actions | Assign, renew, pause, resume, cancel, reactivate |
| Attendance | Search, selected member, inactive warning, duplicate, success |
| CSV import | Upload, preview, validation, partial success, failure |
| Retention | Low, Medium, High, limited assessment, no history |
| Dashboard | Populated, empty, partial data, ML unavailable |
| Conversational AI | Initial, conversation, loading, unavailable, unsupported request |
| Studio settings | Unconfigured, configured, validation, save success |

---

# 8. Stitch Workflow for Akash

Design in the following order. Do not ask Stitch to generate all screens in one prompt.

## Pass 1 — Establish the visual direction

Create:
1. Application shell.
2. Sidebar and top bar.
3. Typography and colour system.
4. Buttons, cards, tables and form styles.

Review the direction with Rahul before generating every screen.

## Pass 2 — Design the operational foundation

Create:
1. Dashboard.
2. Member directory.
3. Add/edit member.
4. Member profile.
5. Membership action dialogs.
6. Attendance check-in.
7. Attendance history.
8. CSV import wizard.

These screens establish the primary user experience.

## Pass 3 — Design intelligence

Create:
1. Retention overview.
2. Member retention tab.
3. Limited assessment state.
4. Recommendation component.
5. Risk trend visualisation.

Ensure that the design explains the deterministic score accurately.

## Pass 4 — Optional experiences

Create:
1. AI Assistant.
2. Minimal studio settings.
3. Validated ML signal placement.

Do not let optional screens delay the core operational design.

## Pass 5 — Responsive and state review

Review:
- Desktop at 1440 × 900.
- Laptop at 1280 × 800.
- Tablet.
- Mobile.

Review the required empty, error, success and warning states.

---

# 9. Required Design Handoff Package

The design is not ready for engineering consumption until Akash hands over the following.

## 9.1 Screen artifacts

For every screen ID:
- Final Stitch screen.
- Consistent screen name and ID.
- Desktop design.
- Responsive design where required.
- Important interaction states.
- Reusable components used.

## 9.2 Design system artifacts

- Colour tokens.
- Typography tokens.
- Spacing tokens.
- Radius and shadow tokens.
- Component variants.
- Icon references.
- Responsive breakpoints.

Where possible, provide tokens in a format engineering can translate directly into CSS variables or Tailwind theme values.

## 9.3 Interaction documentation

For every major action:
- Trigger.
- Expected result.
- Validation.
- Success state.
- Error state.
- Navigation destination.

Examples:
- Add Member → opens member form.
- Save Member → creates record and navigates to profile or directory.
- Check In → records attendance and displays success or duplicate state.
- Import CSV → moves through upload, preview and results.
- Open Retention Queue Member → opens the member profile Retention tab.

## 9.4 Engineering references

Provide:
- Stitch project/share reference.
- Screen IDs and names.
- Exported assets.
- Screenshots at consistent viewport dimensions.
- Component inventory.
- Design tokens.
- Notes for non-obvious interactions.
- Any generated code or export that the team has agreed to use.

Screenshots alone are insufficient if interaction behaviour is not documented.

---

# 10. Design Freeze Acceptance Criteria

The design scope can be declared frozen only when:

- [ ] All P0 screens have approved designs.
- [ ] All P1 screens have approved designs or explicitly documented deferred states.
- [ ] Shared application shell is consistent.
- [ ] Shared design system is documented.
- [ ] Member and membership lifecycle states are represented.
- [ ] Attendance duplicate and inactive-member states are represented.
- [ ] CSV import steps and partial-failure states are represented.
- [ ] Retention score, evidence and recommendation are understandable.
- [ ] Limited assessment is visually distinct.
- [ ] Dashboard values and labels match the product specification.
- [ ] ML is clearly optional and separate from deterministic risk.
- [ ] AI Assistant is optional and read-only.
- [ ] Responsive behaviour is defined.
- [ ] Engineering has screen IDs, assets, tokens and interaction notes.
- [ ] Rahul has reviewed the design against the frozen engineering scope.
- [ ] Sagnik has validated the workflows from the studio owner's perspective.

---

# 11. Change Control After Design Freeze

Once this document and its screen inventory are approved:

1. The screen inventory is frozen.
2. No new routes or major screens are added without an explicit product decision.
3. Visual refinements that do not alter scope may be made.
4. Engineering must not invent missing business behaviour from screenshots.
5. If a design conflicts with the frozen product specification, the product specification wins.
6. If implementation constraints require a design change, Rahul and Akash agree on the smallest change and record it.
7. Optional AI and ML screens must not block core implementation.

---

# 12. Final Screen Inventory and Priority

| Screen ID | Screen | Priority | Design status |
|---|---|---|---|
| AUTH-01 | Sign-in | P1 / existing auth check | Pending |
| DASH-01 | Studio Overview Dashboard | P0 | Pending |
| MEM-01 | Member Directory | P0 | Pending |
| MEM-02 | Add / Edit Member | P0 | Pending |
| MEM-03 | Member Profile with tabs | P0 | Pending |
| MEM-04 | Membership Action Dialogs | P0/P1 | Pending |
| ATT-01 | Attendance Check-in | P0 | Pending |
| ATT-02 | Attendance History | P1 | Pending |
| ATT-03 | CSV Import Wizard | P1 | Pending |
| RET-01 | Retention Overview / Attention Queue | P1 | Pending |
| MEM-03 / Retention tab | Member Retention Details | P1 | Pending |
| CONV-01 | AI Assistant | P3 / Optional | Pending |
| SET-01 | Minimal Studio Settings | P1 | Pending |

**Important:** The inventory contains 13 design entries, but not 13 independent routes. Tabs, dialogs and wizard steps are states within the application. Keep the navigation compact.

---

# 13. Akash's Immediate Execution Checklist

1. [ ] Read the frozen PranaX MVP Product & Engineering Specification v1.0.
2. [ ] Read this Design Scope & Stitch Handoff v1.0.
3. [ ] Create the PranaX visual direction and application shell in Stitch.
4. [ ] Get Rahul's approval on the shell and shared design system.
5. [ ] Design P0 operational screens.
6. [ ] Design P1 retention and attendance screens.
7. [ ] Design optional AI and settings screens only after the core screens.
8. [ ] Complete required interaction and empty/error states.
9. [ ] Review all screens against the engineering specification.
10. [ ] Deliver the complete handoff package.
11. [ ] Get Rahul's engineering sign-off and Sagnik's workflow sign-off.
12. [ ] Declare Design Scope v1.0 frozen.

**Final design objective:**

Deliver one coherent, production-oriented PranaX studio-management experience. Every designed screen must map to a frozen product requirement, and every screen consumed by coding agents must have an identifiable screen ID, documented states and reusable design references.
