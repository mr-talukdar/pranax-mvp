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

`services/intelligence` is not in pnpm. Create and manage its independent environment and dependency manifest from that directory when implementation begins.

## Environment variables

No environment variables or credentials are currently defined. Any required variable must be documented, declared by its owning service, and supplied through an environment-specific secret mechanism.
