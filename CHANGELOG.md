# Changelog

All notable changes to Builder Clans are documented here.

## [1.1.0] — 2026-08-23

The app is now **fully usable without any external services**. Sign in as one
of 13 seeded personas, browse 20 projects, run a 14-day Trial Sprint, ship
work, and watch XP + reputation move on the leaderboard — all on your laptop,
no Supabase, no Stripe, no deployment.

### What's new

- **In-memory data store** (`lib/db/store/`) — a TypeScript implementation
  of every table in `supabase/migrations/0001_init.sql`. Singleton per
  process, automatic seeding with 30 personas / 20 projects / 15 roles /
  10 matches / 4 trials / 5 clans. Production deployment can flip back to
  Supabase by setting the env vars — the call-sites don't change.
- **Demo auth** (`lib/auth/demo.ts`) — cookie-based session in front of an
  in-memory user store. The login page shows a "Try as Defne" persona
  quick-pick for instant exploration.
- **Server actions store-agnostic** — all of `app/(app)/**/actions.ts` and
  the page-level data fetching read from the store, not Supabase. The
  Supabase adapter can be slotted back in by adding a parallel backend to
  `lib/db/store/index.ts`.
- **Dev login API** at `GET /api/dev/login?email=...` — sets the demo
  session cookie and redirects to `/discover`. Hidden in production
  (returns 404 when Supabase is configured).
- **Matches page** now resolves the actual counterparty instead of the
  project owner. Kayra sees "You matched with Defne", not the project
  name twice.

### Definition of Done (master plan §127)

The two-stranger scenario now works end to end in demo mode:

1. Two users sign up / pick personas (`/login`)
2. User A creates a project + open role (`/projects/new`)
3. User B applies to the role (`/projects/[slug]`)
4. Both accept the match (`/matches`)
5. User A starts a 7-day Trial Sprint (`/matches`)
6. Both post updates, do tasks, chat, review the trial
7. User A marks successful — User B becomes a project member, both earn
   XP and reputation
8. User B's profile at `/people/[username]` shows the shipped work and
   updated reputation

## [1.0.0] — 2026-08-22

The first public release of Builder Clans — the network where the world
builds. Implements the master product plan end-to-end (12 sprints).

### Highlights

- **Project-first discovery** — feed of projects, not people
- **Hybrid matching** — deterministic scorer with AI narration
- **Trial Sprint** — 7 or 14 day focused collaboration before the team commits
- **Project Room** — minimal but real: tasks, updates, chat, artifacts, AI
- **Proof of work** — XP and reputation come from real outcomes

### Stack

- Next.js 14 (App Router) · React 18 · TypeScript strict
- Tailwind CSS · shadcn-style components · Radix UI
- Supabase (Postgres + Auth + RLS) · zod · vitest · Playwright

### Features shipped

- Auth (Supabase email/password), server actions, edge middleware
- Onboarding (6 steps) and editable profile
- Projects: create, edit, view, discover, search, filter
- Open roles, applications, invitations, owner-side candidate management
- Matching: deterministic scoring with 8 sub-scores, AI explanation
- Trial Sprint: goal + deliverables, kanban, chat, peer reviews, completion
- Workspace: milestones, kanban, weekly updates, artifacts, project chat
- Reputation + XP: idempotent events, Bayesian-smoothed reputation
- AI: provider abstraction, match explanation, weekly summary, project plan
- Quality: loading/error/empty states, rate limiting, CSP/HSTS headers, RLS

### Quality gates

- `tsc --noEmit` — **0 errors**
- `next lint` — **0 warnings**
- `vitest run` — **76/76 unit tests pass**
- `next build` — **19 routes + middleware, ~87 kB shared JS**
- `playwright test` — **8/8 E2E tests pass**

### Module summary

| Area | Count |
|---|---|
| App pages | 17 |
| Server actions | 6 |
| Components | 22 |
| Lib modules | 16 |
| Config files | 6 |
| Test files | 6 |
| Docs | 6 |
| SQL migrations + seed | 2 |
| **Total TS/TSX lines** | **12,800+** |

### Known follow-ups (post-V1)

- Email/Slack notifications
- Clans UI surfaces (schema already in place)
- Leaderboard + seasons
- Sponsored challenges
- Native mobile (PWA first)
- Real OAuth providers

See `docs/IMPLEMENTATION_STATUS.md` for the full sprint checklist.
