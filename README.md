<div align="center">

<img src="apps/web/public/pranax-logo.png" alt="PranaX Logo" width="180" />

# PranaX

**Next-Generation Multi-Tenant SaaS Platform for Boutique Fitness, Pilates & Yoga Studios**

[![Next.js](https://img.shields.io/badge/Next.js-15.5-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.165-009688?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.12+-3776AB?style=for-the-badge&logo=python)](https://www.python.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-336791?style=for-the-badge&logo=postgresql)](https://supabase.com/)
[![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?style=for-the-badge&logo=prisma)](https://www.prisma.io/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)

<p align="center">
  <a href="#-core-capabilities">Key Features</a> •
  <a href="#-system-architecture">Architecture</a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-synthetic-data--seeding">Synthetic Data</a> •
  <a href="#-configuration">Configuration</a> •
  <a href="#-documentation--adrs">ADRs</a>
</p>

</div>

---

## 🌟 Overview

**PranaX** gives boutique fitness, Pilates, and yoga studio owners and operators a modern command center. It unifies essential operational workflows—member management, attendance tracking, and class rosters—with deterministic retention risk intelligence and a guarded, privacy-safe conversational AI studio assistant.

```
┌──────────────────────────────────────────────────────────────────────────┐
│                             PranaX Platform                              │
│                                                                          │
│   [ Studio Onboarding ]  ───>  [ Operations & Roster ]  ───> [ Dashboard ]│
│            │                               │                      ▲      │
│            ▼                               ▼                      │      │
│   [ Tenant Isolation ]         [ CSV Batch Ingestion ]            │      │
│            │                               │                      │      │
│            ▼                               ▼                      │      │
│   [ Supabase Auth RLS ]        [ Deterministic Retention Engine ] ────────┘
│                                            │                             │
│                                            ▼                             │
│                              [ Guarded AI Studio Assistant ] ─────────────┘
└──────────────────────────────────────────────────────────────────────────┘
```

---

## ✨ Core Capabilities

### 📊 1. Studio Owner Command Center (`/dashboard`)

- **30-Second Health Assessment:** Real-time visibility into active members, new registrations, and today's unique check-ins.
- **Membership Lifecycle Tracking:** Granular breakdown of active, paused, expiring within 7 days, and expired memberships.
- **Timezone-Aligned Attendance Trends:** Continuous 14-day zero-filled check-in trend chart synced with the studio's IANA timezone.
- **Retention Risk Distribution:** Accurate categorization (Low, Medium, High risk) deduplicated to the latest assessment per eligible member.
- **Prioritized Attention Queue:** Actionable member list with verified, non-hallucinated retention risk drivers and targeted next steps.

### 👥 2. Member Management & Profiles (`/members`)

- **Dynamic Member Directory:** Instant search and multi-criteria status filtering (Active, Paused, Expired, Cancelled).
- **Complete Lifecycle History:** Member creation, profile editing, and transparent membership period tracking.
- **360° Member View:** Comprehensive profiles showing membership status, attendance logs, and explainable retention risk factors.

### 📅 3. Attendance Tracking & CSV Import (`/attendance`)

- **One-Click Check-In:** Daily attendance check-ins with studio-local date deduplication (`@@unique([studioId, memberId, localDate])`).
- **Resilient CSV Ingestion (`/attendance/import`):** Flexible batch importer featuring interactive column mapping, client-side validation, error isolation, and duplicate protection.

### 🧠 4. Deterministic Retention Intelligence (`/retention`)

- **Multi-Factor Risk Engine:** Independent Python calculation engine assessing visit recency, 30/60-day attendance trend velocity, cadence consistency, and tenure.
- **Immutable Snapshot History (`RetentionSnapshot`):** Point-in-time assessment records capturing historical score shifts without mutating past evaluations ([ADR-003](docs/decisions/ADR-003-retention-snapshot-history.md)).
- **Empirical Recommendations:** Grounded, rule-based and LLM-assisted retention interventions driven strictly by verified member metrics.

### 🤖 5. Guarded AI Studio Assistant (`/assistant`)

- **Strictly Scoped Query Router:** Fast server-side intent classification restricting queries to 4 read-only operations: `attendance_summary`, `membership_summary`, `retention_summary`, and `studio_overview` ([ADR-005](docs/decisions/ADR-005-conversational-assistant.md)).
- **Zero PII Exposure:** No member names, phone numbers, emails, or raw database credentials ever enter model prompts.
- **Evidence Grounding:** Every insight cites concrete metric identifiers, backed by Gemini with automatic deterministic fallback.

### 🔒 6. Multi-Tenant Architecture & Security

- **Server-Enforced Tenancy:** Verified session boundary via `withVerifiedStudioContext(authUserId, studioId, tx)`. Client-supplied tenant IDs are never trusted directly.
- **PostgreSQL Row-Level Security:** RLS policies and session-scoped `app.studio_id` ensure strict tenant isolation.

---

## 🏗️ System Architecture

```
pranax-mvp/
├── 🌐 apps/
│   └── web/                   # Next.js 15 (App Router, React 19, Tailwind CSS)
│       ├── src/app/           # Application pages & API route handlers
│       ├── src/components/    # Reusable UI components & dashboard widgets
│       └── src/server/        # Auth, DB context, services, and tenant enforcement
│
├── ⚡ services/
│   └── intelligence/          # Standalone Python 3.12+ FastAPI microservice
│       ├── contracts.py       # Pydantic input/output schemas
│       ├── conversation.py    # AI assistant routing & grounded responses
│       ├── engine.py          # Deterministic retention scoring algorithms
│       └── main.py            # Authenticated FastAPI route handlers
│
├── 📦 packages/
│   ├── contracts/             # Shared TypeScript API contracts & Zod schemas (@pranax/contracts)
│   ├── database/              # Prisma schema, migrations, tenant helpers & seed loader (@pranax/database)
│   ├── config/                # Shared non-secret configuration constants (@pranax/config)
│   └── utils/                 # Dependency-light shared TypeScript utilities (@pranax/utils)
│
├── 🛠️ tools/
│   └── synthetic-data/        # Standalone Python synthetic data factory & CLI validator
│
├── 📂 datasets/               # Generated synthetic studio datasets (v1.2.0, v1.3.0)
└── 📚 docs/                   # ADRs, system overview, and architectural documentation
```

---

## 🚀 Quick Start

### Prerequisites

| Tool           | Version Requirement                         |
| :------------- | :------------------------------------------ |
| **Node.js**    | `>= 24.0.0`                                 |
| **pnpm**       | `^12.14.0`                                  |
| **Python**     | `>= 3.12`                                   |
| **PostgreSQL** | Local PostgreSQL or Supabase CLI (`^3.2.0`) |

---

### Step 1: Clone & Install Dependencies

```bash
# Clone the repository
git clone https://github.com/your-org/pranax-mvp.git
cd pranax-mvp

# Install monorepo dependencies
pnpm install

# Initialize local environment variables
cp .env.example .env
```

---

### Step 2: Database Setup & Migrations

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

---

### Step 3: Run the Web Application

```bash
# Launch Next.js development server
pnpm --filter @pranax/web dev
```

The web application will be accessible at [`http://localhost:3000`](http://localhost:3000):

| Route                | View                                     |
| :------------------- | :--------------------------------------- |
| `/`                  | Public Landing Page & Studio Onboarding  |
| `/dashboard`         | Studio Owner Command Center              |
| `/members`           | Member Directory & Profile Views         |
| `/attendance`        | Daily Check-In & Attendance History      |
| `/attendance/import` | CSV Attendance Batch Importer            |
| `/retention`         | Retention Risk Scoring & Attention Queue |
| `/assistant`         | Guarded AI Studio Assistant              |

---

### Step 4: Run the Intelligence Service

The Python intelligence service manages retention risk calculations and conversational AI operations:

```bash
cd services/intelligence

# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies in editable mode
pip install -e '.[test]'

# Start the FastAPI server
uvicorn pranax_intelligence.main:app --reload --port 8000
```

- Service Health Check: `http://localhost:8000/health`
- Service-to-service endpoints require `Authorization: Bearer <INTELLIGENCE_SERVICE_TOKEN>`.

---

## 🧪 Synthetic Data & Seeding

PranaX includes a standalone deterministic synthetic data generator that creates realistic, multi-month studio activity without requiring a live database:

```bash
# Generate deterministic synthetic dataset
pnpm synthetic:generate

# Run synthetic generator validation suite
pnpm synthetic:test

# Seed synthetic dataset into PostgreSQL via transactional Prisma loader
pnpm --filter @pranax/database seed
```

> **Note:** The Python generator produces standalone JSON artifacts and never connects to PostgreSQL. Only the TypeScript seed loader writes to the database, ensuring strict validation and isolating changes to synthetic tenant accounts.

---

## 🛡️ Workspace Commands & Quality Gates

Run checks across all workspaces:

```bash
# Typecheck TypeScript packages
pnpm typecheck

# Lint workspace files
pnpm lint

# Run all test suites
pnpm test

# Build production bundles
pnpm build
```

Targeted package tests:

```bash
# Shared contracts tests
pnpm --filter @pranax/contracts test

# Database layer tests
pnpm --filter @pranax/database test

# Web application tests
pnpm --filter @pranax/web test

# Python intelligence tests
python3 -m pytest services/intelligence/tests -q
```

---

## ⚙️ Configuration

Key environment variables declared in `.env.example`:

| Variable                               | Description                                                            | Context          |
| :------------------------------------- | :--------------------------------------------------------------------- | :--------------- |
| `DATABASE_URL`                         | Pooled connection string for PostgreSQL / Supabase                     | Server-side      |
| `DIRECT_URL`                           | Direct connection string for Prisma migrations                         | Server-side      |
| `NEXT_PUBLIC_SUPABASE_URL`             | Supabase API endpoint URL                                              | Client / Server  |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase client publishable key                                        | Client / Server  |
| `NEXT_PUBLIC_SITE_URL`                 | Base public web application origin (`http://localhost:3000`)           | Client / Server  |
| `SUPABASE_SECRET_KEY`                  | Supabase service-role secret key                                       | Server-side only |
| `SUPABASE_JWT_SECRET`                  | Supabase JWT secret for token verification                             | Server-side only |
| `INTELLIGENCE_URL`                     | Base URL for FastAPI intelligence service (`http://localhost:8000`)    | Server-side only |
| `INTELLIGENCE_SERVICE_TOKEN`           | Shared secret bearer token (min. 32 chars) securing Next.js ↔ FastAPI | Server-side only |
| `GEMINI_API_KEY`                       | Optional Gemini API key for conversational AI assistant                | Python runtime   |

---

## 📖 Architectural Decision Records (ADRs)

Key architectural decisions governing PranaX:

| ADR                                                                      | Title                                | Key Decisions                                                                 |
| :----------------------------------------------------------------------- | :----------------------------------- | :---------------------------------------------------------------------------- |
| [ADR-001](docs/architecture/ADR-001-application-backend-and-database.md) | **Application Backend & Database**   | Next.js server boundary, Prisma Migrate authority, PostgreSQL RLS.            |
| [ADR-002](docs/decisions/ADR-002-retention-service-boundary.md)          | **Deterministic Retention Boundary** | Standalone Python scoring engine, authenticated bearer token.                 |
| [ADR-003](docs/decisions/ADR-003-public-onboarding-and-auth.md)          | **Public Onboarding & Auth**         | Supabase Auth SSR, public landing page, studio workspace bootstrap.           |
| [ADR-003](docs/decisions/ADR-003-retention-snapshot-history.md)          | **Immutable Retention Snapshots**    | SHA-256 fingerprint deduplication, append-only history.                       |
| [ADR-004](docs/decisions/ADR-004-owner-dashboard-data-layer.md)          | **Owner Dashboard Data Layer**       | Server aggregation, local timezone calendar alignment, unbroken trend series. |
| [ADR-005](docs/decisions/ADR-005-conversational-assistant.md)            | **Guarded Studio Assistant**         | Bounded intent routing, 4 read-only operations, zero PII, evidence citation.  |

---

## 🧑‍💻 Contributing & Agent Guidelines

Contributors and AI agents must follow [AGENTS.md](AGENTS.md) and directory-level guidelines:

- [Web Application Instructions](apps/web/AGENTS.md)
- [Intelligence Service Instructions](services/intelligence/AGENTS.md)
- [Shared Contracts Instructions](packages/contracts/AGENTS.md)
- [Agent Coordination Guide](docs/agents/agent-coordination.md)
