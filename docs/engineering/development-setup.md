# Development Setup

## Prerequisites

- pnpm 12.14.0
- Node.js 24+
- Python 3.12+ (verified on 3.12/3.14)
- PostgreSQL or Supabase instance (local CLI or hosted)

## Repository setup

```bash
pnpm install
cp .env.example .env
```

## Workspace checks

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Individual package tests:

```bash
pnpm --filter @pranax/contracts test
pnpm --filter @pranax/database test
pnpm --filter @pranax/web test
```

## Database operations

```bash
pnpm db:generate
pnpm db:validate
pnpm db:migrate:status
pnpm db:migrate:deploy
```

To seed synthetic studio data into the database:

```bash
pnpm --filter @pranax/database seed
```

## Running the Web Application

```bash
pnpm --filter @pranax/web dev
```

Available routes:

- Landing / Onboarding: `http://localhost:3000/`
- Owner Dashboard: `http://localhost:3000/dashboard`
- Members Management: `http://localhost:3000/members`
- Attendance Management & CSV Import: `http://localhost:3000/attendance`
- Retention Intelligence: `http://localhost:3000/retention`
- Studio Assistant: `http://localhost:3000/assistant`

## Python Intelligence Service

`services/intelligence` is managed independently from pnpm.

```bash
cd services/intelligence
python3 -m venv .venv
source .venv/bin/activate
pip install -e '.[test]'
pytest tests -q
uvicorn pranax_intelligence.main:app --reload --port 8000
```

Health check is unauthenticated at `GET /health`. Analytics and assistant endpoints require `Authorization: Bearer <INTELLIGENCE_SERVICE_TOKEN>`.

## Environment variables

Configured in `.env` (see `.env.example`):

- `DATABASE_URL` / `DIRECT_URL`: Database connection strings.
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: Supabase client credentials.
- `SUPABASE_SECRET_KEY` / `SUPABASE_JWT_SECRET`: Server-side Supabase verification.
- `INTELLIGENCE_URL` (`http://localhost:8000`) & `INTELLIGENCE_SERVICE_TOKEN`: Web server-to-intelligence service bearer authentication (minimum 32 characters).
- `GEMINI_API_KEY`: Optional Gemini API key in intelligence service runtime for enhanced conversational explanations.
- `NEXT_PUBLIC_SITE_URL`: Web origin for Supabase email-confirmation redirects (e.g. `http://localhost:3000`).
