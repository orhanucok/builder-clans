# Security

## Layers

1. **Validation** — every server action validates with zod (`lib/validation/schemas.ts`).
2. **Authorization** — every server action calls `resolveProjectPermissions` /
   `resolveTrialPermissions` (or similar) before mutating.
3. **Rate limiting** — `lib/rate-limit.ts` provides a per-key per-minute cap.
   AI endpoints default to 20/min. Sign in/sign up are capped at 5–10/min.
4. **Row Level Security (RLS)** — Supabase Postgres RLS enforces per-row access
   on every table (`supabase/migrations/0001_init.sql`).
5. **Secrets** — `.env` files are never committed. Production secrets are
   injected at deploy time. The service-role key is server-only.
6. **Headers** — `next.config.js` sets `X-Content-Type-Options`, `X-Frame-Options`,
   `Referrer-Policy`, `X-DNS-Prefetch-Control` on every response.

## Threat model

- **Stolen JWTs** — service-role key is server-only; anon key is fine for the
  browser because RLS prevents cross-user data leakage.
- **Self-XSS** — RLS prevents a user from inserting projects / matches on
  behalf of others.
- **Replay** — XP and reputation events are idempotent (unique constraint on
  `event_type + entity_id + idempotency_key`).
- **Brute force** — rate limiting on auth endpoints.
- **Content injection** — all user text is stored as `text`; the UI does not
  render `dangerouslySetInnerHTML`. Markdown rendering is not in V1.

## Reporting

- Every entity (user, project, message) can be reported via `lib/validation/schemas.ts`
  (`reportCreateSchema`). Reports are stored in `public.reports` and visible
  only to the reporter. Admin moderation is out of scope for V1.

## What V1 does NOT do

- No email verification enforcement beyond Supabase defaults
- No 2FA
- No full moderation / admin dashboard
- No automated spam detection
