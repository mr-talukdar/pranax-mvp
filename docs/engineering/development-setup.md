# Development Setup

## Prerequisites

- pnpm 12.14.0
- Node.js 24 or a version approved for each scaffolded package
- Python 3.12+ for future intelligence work, unless a service baseline supersedes it

## Repository setup

```bash
pnpm install
```

## Workspace checks

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Root checks may be conditional or no-op until the workspace applications provide scripts.

## Python service

`services/intelligence` is not in pnpm. Manage its Python environment and dependency manifest independently from that directory. The retention API command and test command are documented in the [service README](../../services/intelligence/README.md).

## Environment variables

Do not commit real credentials. Required variables must be documented, declared by their owning service, and supplied through an environment-specific secret mechanism.

The retention service boundary uses `INTELLIGENCE_URL` and the server-only `INTELLIGENCE_SERVICE_TOKEN`. Configure the same random token of at least 32 characters in the Next.js and Python service environments. The repository `.env.example` contains a placeholder only. See [ADR-002](../decisions/ADR-002-retention-service-boundary.md) and the [intelligence service README](../../services/intelligence/README.md).
