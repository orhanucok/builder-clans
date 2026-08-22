# Architecture

## High-level

```
   ┌──────────────────────┐
   │  Next.js App Router  │ ← RSC, server actions, route handlers
   └──────────┬───────────┘
              │
   ┌──────────▼───────────┐
   │  Domain (config/)    │ ← enums, weights, status machines, XP rules
   │  lib/matching, xp,   │
   │  reputation, ai      │
   └──────────┬───────────┘
              │
   ┌──────────▼───────────┐
   │  Supabase (Postgres) │ ← RLS, triggers, helpers
   └──────────────────────┘
```

## Modular monolith

There is **one** Next.js process and **one** Postgres database. The codebase is
logically modular:

- `app/(app)/<feature>/page.tsx` — UI for a feature
- `app/(app)/<feature>/actions.ts` — server actions for that feature
- `lib/<feature>/` — domain logic
- `config/<feature>.ts` — constants, enums, weights
- `components/<feature>/` — feature-specific UI

Features import from `lib/`, never from each other except through well-defined
contracts in `config/`.

## Server vs client

- All data fetching happens in RSC. The browser only re-renders on user action.
- Server actions in `app/**/actions.ts` are the single mutation surface. They:
  1. Validate with zod (`lib/validation/schemas.ts`).
  2. Check authorization with `lib/permissions/checks.ts`.
  3. Mutate with Supabase.
  4. Award XP / reputation if appropriate.
  5. `revalidatePath()`.
  6. Redirect or return a result.

## Auth

- `lib/auth/session.ts` exposes `getCurrentUser()` and `requireUser()`.
- `middleware.ts` (TODO when middleware is wired) will redirect unauthenticated
  traffic to `/login`.
- RLS is the second line of defense; we never trust the client.

## Matching

- Deterministic scoring lives in `config/matching.ts`.
- Server actions fetch project + candidate pool, run the scorer, persist
  `match_scores` and `matches` rows.
- AI narration is layered on top via `lib/ai/features.ts:aiMatchExplanation`.
  If the AI fails, the deterministic explanation is used (master plan §93).

## XP / reputation

- `lib/xp/award.ts` writes to `xp_events` with an idempotency key. The DB has a
  `unique (user_id, event_type, idempotency_key)` constraint, so retries are safe.
- `lib/reputation/apply-event.ts` writes to `reputation_events` and then calls
  `recompute_reputation` (a SQL function) to recompute `profiles.reputation_score`.

## AI

- `lib/ai/provider.ts` defines the `AiProvider` interface and the factory
  `getAiProvider()`.
- `lib/ai/features.ts` exposes the high-level features. Every function checks
  `isFeatureEnabled('AI_FEATURES')` and falls back to deterministic output if
  the provider is `mock` or the call fails.
- Provider config is in `.env`: `AI_PROVIDER` ∈ `openai|anthropic|mock`.

## RLS summary

- `projects`: public + members + owner can read; only owner writes.
- `applications`: applicant can insert; only owner can read/update.
- `matches`: only participants can read; participants + owner can write.
- `trial_members`, `trial_reviews`, `trial`, `messages`: only participants.
- `xp_events`, `reputation_events`: only the user can read their own.
- `notifications`: only the user.

Full SQL in `supabase/migrations/0001_init.sql`.
