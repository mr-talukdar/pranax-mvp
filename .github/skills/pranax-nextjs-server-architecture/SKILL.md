---
name: pranax-nextjs-server-architecture
description: Guides Next.js Server Actions, Route Handlers, Server Components, server-only modules, authentication boundaries, Zod validation, Prisma access, and serverless constraints for PranaX.
---

# PranaX Next.js server architecture

Use this skill for `apps/web` application backend work.

## Ownership

- Server Components fetch server-authorized data.
- Server Actions perform application mutations after verification and validation.
- Route Handlers provide explicit HTTP contracts and external integrations.
- `src/server/auth/` verifies Supabase identity and studio membership.
- `src/server/db/` owns Prisma access and tenant context.
- `src/server/services/` owns business operations.
- `src/server/validation/` owns Zod boundary validation.
- Shared contracts belong in `packages/contracts` only when genuinely shared.

## Security rules

- Every mutation independently verifies the authenticated user and StudioUser membership.
- Never trust a browser studio ID as authorization.
- Never expose database credentials or Supabase secrets in client components or `NEXT_PUBLIC_*` variables.
- Use `server-only` for auth, database, and secret modules.
- Do not place all business logic in Server Actions or Route Handlers.
- Do not assume middleware or hidden UI controls authorize operations.
- Keep ordinary operations serverless-compatible; do not start persistent background jobs.

## Verification

- Run TypeScript typecheck and web build.
- Test health, authentication failures, StudioUser membership failures, and tenant-scoped mutations.
- Verify no server-only module is imported into a client bundle.
