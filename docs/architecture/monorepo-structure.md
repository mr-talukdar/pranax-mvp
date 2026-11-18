# Monorepo Structure

This repository is organized as a pnpm workspace for TypeScript and JavaScript packages, with an intentionally independent Python service.

```text
apps/web       Next.js frontend
services/api   Express API
services/intelligence  Python service outside pnpm
packages/*     Shared TypeScript configuration and contracts
infrastructure Container and deployment organization
docs           Architecture and engineering documentation
```

The pnpm workspace includes `apps/*`, `services/api`, and `packages/*`. `services/intelligence` is not a workspace package and must manage Python dependencies independently.

The structure separates deployable units and shared code while avoiding premature package extraction. A package may be created only when it has a clear cross-service or cross-app owner.
