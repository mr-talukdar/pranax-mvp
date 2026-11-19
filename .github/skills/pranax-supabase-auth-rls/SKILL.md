---
name: pranax-supabase-auth-rls
description: Guides Supabase Auth verification, StudioUser membership, PostgreSQL RLS, Prisma transaction identity propagation, database role safety, and cross-tenant testing for PranaX.
---

# PranaX Supabase Auth and RLS

Use this skill for Supabase identity, StudioUser membership, RLS, and tenant isolation.

## Required procedure

1. Verify the JWT using Supabase server-side `getUser()` or an equivalent cryptographic mechanism.
2. Resolve `authUserId` to StudioUser membership.
3. Treat the selected studio ID as an authorization request, never proof.
4. Begin a Prisma transaction.
5. Set transaction-local authenticated identity context.
6. Switch the runtime transaction to the least-privileged Supabase runtime role.
7. Execute tenant-scoped operations and commit or roll back.

## RLS rules

- Enable RLS on every tenant-owned table.
- Policies must verify `auth.uid()` and StudioUser membership.
- Provide separate SELECT, INSERT, UPDATE, DELETE policies or an ALL policy with correct `USING` and `WITH CHECK`.
- Force RLS on application-owned tables.
- Grant only required privileges to the runtime role.
- Never rely on `app.studio_id` alone.
- Never store identity in process-global mutable state.
- Never use a service-role or migration credential in browser code.

## Testing

Test two Auth users and two studios for cross-tenant SELECT, INSERT, UPDATE, DELETE, unauthenticated access, invalid membership, membership removal, and concurrent transaction isolation.
