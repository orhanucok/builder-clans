# Changelog

All notable changes to Builder Clans are documented here.

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
