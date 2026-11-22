# PranaX

PranaX is a modern multi-tenant SaaS platform tailored for boutique fitness, Pilates, and yoga studios. It provides studio owners and operators with an integrated operational command center: member management, attendance and session tracking with CSV imports, deterministic retention intelligence with explainable factor scoring, and a guardrailed AI assistant for studio operations.

---

## Current Status & Capabilities

The platform has transitioned from initial foundation scaffolds into an end-to-end operational MVP:

- **Public Landing & Studio Onboarding:**
  - Modern marketing and onboarding experience at `/`.
  - Supabase Auth SSR integration (session cookies, email confirmation, authenticated callback).
  - Studio workspace bootstrapping on sign-up, ensuring one initial studio per owner identity.
  - Development and evaluation demo mode backed by published synthetic credentials (`apps/web/public/demo-credentials.json`).

- **Studio Owner Dashboard (`/dashboard`):**
  - High-level 30-second operational health metrics: active members, new registrations, and today's unique check-ins.
  - Membership lifecycle breakdown: active, paused, expiring within 7 days, and expired counts.
  - Continuous 14-day zero-filled attendance trend sequence aligned to the studio's local IANA timezone.
  - Retention risk distribution (Low, Medium, High risk counts and percentages) deduplicated to the latest member assessment.
  - Prioritized Attention Queue highlighting high-risk and medium-risk members with verified, non-hallucinated retention factors and recommendations.

- **Member Management (`/members`, `/members/new`, `/members/[memberId]`):**
  - Searchable, filterable member directory with active membership badges and retention risk indicators.
  - Member creation with instant profile provisioning.
  - In-depth member profile views containing membership history, attendance timelines, and explainable retention risk factor breakdowns.

- **Attendance Tracking & Batch Import (`/attendance`, `/attendance/import`):**
  - Daily check-in registration and class attendance records tied to class sessions.
  - Resilient bulk CSV attendance importer featuring interactive column mapping, client-side format pre-validation, preview verification, and database duplicate collision prevention (`@@unique([studioId, memberId, localDate])`).

- **Retention Risk Intelligence Engine (`/retention`):**
  - Standalone deterministic calculation engine in Python/FastAPI (`services/intelligence/`).
  - Multi-factor risk scoring evaluating attendance cadence, 30-to-60 day attendance trend velocity, absence recency, and membership tenure.
  - Historical retention snapshot persistence (`RetentionSnapshot`) capturing point-in-time scores, risk tiers, and factor attributions.
  - Actionable, rule-based and LLM-assisted member retention recommendations grounded strictly in empirical metrics.

- **Guarded AI Studio Assistant (`/assistant`, `/api/assistant`):**
  - Conversational analytics assistant designed specifically for studio owners ([ADR-005](docs/decisions/ADR-005-conversational-assistant.md)).
  - Server-side intent routing restricts queries to four predefined read-only operations: attendance summary, membership summary, retention summary, and studio overview.
  - Zero PII leakage: member names, contacts, and raw personal records are never sent to model prompts; only bounded aggregate metrics are used.
  - Powered by Gemini API with deterministic fallback when API keys are absent or services are unreachable.
  - Evidence-backed responses citing concrete verifiable metric IDs.

- **Multi-Tenant Security & Isolation:**
  - Strict tenant boundary enforcement via `withVerifiedStudioContext(authUserId, studioId, tx)`.
  - Server-verified Supabase Auth identity mapped to `StudioUser` roles. Studio IDs are resolved server-side from session context and are never trusted from client payloads alone.

---

## Monorepo Architecture

```
pranax-mvp/
├── apps/
│   └── web/                   # Next.js 15 (App Router, React 19, Tailwind CSS), server route handlers
├── services/
│   └── intelligence/          # Python 3.12+ FastAPI service: retention scoring engine & AI assistant
├── packages/
│   ├── contracts/             # Shared TypeScript API contracts & Zod schemas (@pranax/contracts)
│   ├── database/              # Prisma ORM schema, migrations, tenant context & seed loader (@pranax/database)
│   ├── config/                # Shared non-secret configuration constants (@pranax/config)
│   └── utils/                 # Dependency-light shared TypeScript utilities (@pranax/utils)
├── tools/
│   └── synthetic-data/        # Standalone Python synthetic data generator & CLI validator
├── datasets/                  # Generated synthetic studio datasets (v1.2.0, v1.3.0)
└── docs/                      # Architectural decisions (ADRs), system overview, and data dictionary
```

---

## Prerequisites

- **Node.js**: `>= 24.0.0`
- **pnpm**: `^12.14.0`
- **Python**: `>= 3.12`
- **PostgreSQL**: Local PostgreSQL or Supabase instance (CLI v3+)

---

## Getting Started

### 1. Repository Setup

Clone the repository and install TypeScript workspace dependencies:

```bash
pnpm install
```

Configure your local environment:

```bash
cp .env.example .env
```

Ensure `.env` contains valid configuration for your database and service endpoints (see [Configuration & Environment Variables](#configuration--environment-variables)).

### 2. Database Setup & Migrations

Validate the schema and inspect migrations:

```bash
# Generate Prisma Client
pnpm db:generate

# Validate Prisma schema
pnpm db:validate

# Inspect migration status
pnpm db:migrate:status

# Optional: start local Supabase instance
pnpm supabase:start
```

### 3. Running the Next.js Web Application

Start the development web server:

```bash
pnpm --filter @pranax/web dev
```

The web application is served at [http://localhost:3000](http://localhost:3000):

- Public Landing: `http://localhost:3000/`
- Owner Dashboard: `http://localhost:3000/dashboard`
- Studio Assistant: `http://localhost:3000/assistant`

### 4. Running the Intelligence Service

The Python intelligence service handles retention risk calculations and conversational AI operations. Set up its virtual environment independently:

```bash
cd services/intelligence

# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install service dependencies in editable mode
pip install -e .

# Run the FastAPI server
uvicorn pranax_intelligence.main:app --reload --port 8000
```

The intelligence service is served at [http://localhost:8000](http://localhost:8000) (health check at `GET /health`).

---

## Synthetic Data Generation & Seeding

PranaX includes a standalone deterministic synthetic data generator. It generates rich, realistic multi-month studio activity without requiring a live database connection:

```bash
# Generate synthetic dataset artifact
pnpm synthetic:generate

# Run synthetic generator test suite
pnpm synthetic:test
```

To seed the generated dataset into your database via the transactional Prisma loader:

```bash
pnpm --filter @pranax/database seed
```

> **Note:** The Python generator produces pure JSON artifacts and never connects to PostgreSQL. Only the TypeScript seed loader writes to the database, enforcing strict validation and only populating designated synthetic studios.

---

## Workspace Scripts & Quality Gates

Run quality verification across the workspace:

```bash
# Typecheck all TypeScript workspaces
pnpm typecheck

# Lint workspace files
pnpm lint

# Execute all automated test suites
pnpm test

# Build production artifacts
pnpm build
```

Individual package tests:

```bash
# Run contracts test suite
pnpm --filter @pranax/contracts test

# Run database tests
pnpm --filter @pranax/database test

# Run web app tests
pnpm --filter @pranax/web test
```

---

## Configuration & Environment Variables

| Variable                               | Description                                                                                                                                                             |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                         | Pooled connection string to PostgreSQL / Supabase                                                                                                                       |
| `DIRECT_URL`                           | Direct connection string for Prisma migrations                                                                                                                          |
| `NEXT_PUBLIC_SUPABASE_URL`             | Supabase API endpoint URL                                                                                                                                               |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase client publishable key                                                                                                                                         |
| `NEXT_PUBLIC_SITE_URL`                 | Base public web application origin (e.g., `http://localhost:3000`)                                                                                                      |
| `SUPABASE_SECRET_KEY`                  | Supabase service-role secret key (server-side only)                                                                                                                     |
| `SUPABASE_JWT_SECRET`                  | Supabase JWT secret for token verification                                                                                                                              |
| `INTELLIGENCE_URL`                     | Base URL for the FastAPI intelligence service (`http://localhost:8000`)                                                                                                 |
| `INTELLIGENCE_SERVICE_TOKEN`           | Shared secret bearer token (minimum 32 characters) securing communication between Next.js and FastAPI                                                                   |
| `GEMINI_API_KEY`                       | Optional Google Gemini API key used by the intelligence service for conversational assistant explanations (gracefully falls back to deterministic summaries if omitted) |

---

## Documentation & Decisions

Architectural decisions and specifications are tracked in [`docs/`](docs/):

- [ADR-001: Next.js Backend & Database Architecture](docs/architecture/ADR-001-application-backend-and-database.md)
- [ADR-002: Deterministic Retention Service Boundary](docs/decisions/ADR-002-retention-service-boundary.md)
- [ADR-003: Public Onboarding & Studio Authentication](docs/decisions/ADR-003-public-onboarding-and-auth.md)
- [ADR-003: Immutable Retention Snapshot History](docs/decisions/ADR-003-retention-snapshot-history.md)
- [ADR-004: Owner Dashboard Backend Data Layer & Aggregations](docs/decisions/ADR-004-owner-dashboard-data-layer.md)
- [ADR-005: Guarded Studio Analytics Assistant](docs/decisions/ADR-005-conversational-assistant.md)

---

## Engineering & Agent Instructions

Contributors and AI agents must follow [AGENTS.md](AGENTS.md) and scoped guidelines:

- Web Application: [apps/web/AGENTS.md](apps/web/AGENTS.md)
- Intelligence Service: [services/intelligence/AGENTS.md](services/intelligence/AGENTS.md)
- Shared Contracts: [packages/contracts/AGENTS.md](packages/contracts/AGENTS.md)
- Agent Coordination: [docs/agents/agent-coordination.md](docs/agents/agent-coordination.md)
