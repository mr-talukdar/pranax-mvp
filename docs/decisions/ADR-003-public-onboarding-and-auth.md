# ADR-003: Public onboarding and studio authentication

- **Status:** Accepted
- **Date:** 2026-11-21
- **Decision owners:** Product and engineering

## Context

The original application opened the seeded synthetic studio by establishing a demo session automatically. That prevented a public product landing page, did not let a studio owner create a separate workspace, and coupled browser API calls to one hard-coded studio ID.

## Decision

The root route is a public PranaX landing page. Sign-up and sign-in are handled through Supabase Auth. A newly authenticated user receives a studio workspace through the existing database bootstrap function; the user becomes its owner and the workspace starts without members, memberships, attendance, or retention snapshots.

The application uses the Supabase server session cookies and a server-set active-studio cookie. Route handlers resolve the signed-in identity and verify its membership before business queries. The browser does not establish a studio ID or receive a service credential. Because the demo studio contains synthetic data, its sign-in credentials are intentionally published in `apps/web/public/demo-credentials.json` and displayed on the sign-in page. The demo setup script reads the same file so recreated accounts keep the displayed password.

Supabase email confirmation returns to `/auth/callback`. `NEXT_PUBLIC_SITE_URL` supplies the canonical web origin when configured, and the callback URL must be included in the Supabase Auth redirect allowlist.

## Consequences

- `/` is public and the authenticated dashboard is available at `/dashboard`.
- Sign-up creates a studio only after Supabase establishes an authenticated identity.
- When email confirmation is enabled, workspace bootstrap happens after the confirmation callback establishes the session.
- Application APIs no longer auto-create or auto-sign-in the demo account.
- A shared synthetic demo account remains a shared workspace; anyone can view its public credentials and make changes to its synthetic data. No real member records may be placed in that workspace.
- The existing bootstrap function remains responsible for enforcing one initial owner studio per auth identity.

## Alternatives considered

- Keep the demo account as the only entry path: rejected because it cannot isolate customer workspaces.
- Accept a studio ID from the sign-up form: rejected because tenant identity must be established on the server.
- Hide demo credentials and distribute them out of band: rejected because the intended demo experience makes the synthetic account directly available from the sign-in page.
