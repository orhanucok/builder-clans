# Implementation Status

> Tracks the master plan's 12 sprints. Updated as work lands.

## Sprint 1 — Foundation ✅

- [x] Project setup (Next.js 14 + TS + Tailwind + shadcn-style primitives)
- [x] Environment validation (`lib/env.ts`)
- [x] Design system (tokens, components, dark/light theme)
- [x] Base layout (sidebar, topbar, error/empty states)
- [x] Supabase clients (server / browser / service-role)
- [x] Auth (sign up, sign in, sign out)
- [x] Protected route gating
- [x] Setup banner for demo mode

## Sprint 2 — Profile ✅

- [x] Onboarding flow (6 steps)
- [x] Edit profile / settings
- [x] Skills (canonical, with synonyms)
- [x] Interests
- [x] Weekly availability
- [x] Public profile page (`/people/[username]`)

## Sprint 3 — Projects ✅

- [x] Project create / edit
- [x] Project detail page (`/projects/[slug]`)
- [x] Discover feed (For You / New / Needs Teammates)
- [x] Search & filters (category, remote, query)
- [x] Members display

## Sprint 4 — Open Roles ✅

- [x] Project roles (create / list)
- [x] Applications
- [x] Invitations
- [x] Owner-side application management (accept / reject / invite)

## Sprint 5 — Matching ✅

- [x] Deterministic scoring (`config/matching.ts`)
- [x] Candidate generation (`lib/matching/generate.ts`)
- [x] Score breakdown persisted
- [x] Match UI (`/matches`)
- [x] Mutual accept flow
- [x] AI explanation (with deterministic fallback)

## Sprint 6 — Trial Sprint ✅

- [x] Create trial from mutual match
- [x] Goal + deliverables
- [x] Default task list
- [x] Trial chat
- [x] Task kanban
- [x] Duration (7 / 14 days)
- [x] Reviews (private, 1–5 per dimension)
- [x] Trial completion (successful / ended)

## Sprint 7 — Team Conversion ✅

- [x] Successful trial → project member
- [x] XP awarded to both parties
- [x] Reputation boosted

## Sprint 8 — Workspace ✅

- [x] Project room navigation (Overview / Tasks / Updates / Chat / Members / Artifacts / AI / Settings)
- [x] Milestones
- [x] Kanban tasks
- [x] Updates (with weekly template)
- [x] Artifacts
- [x] Project chat
- [x] AI weekly summary
- [x] Ship action

## Sprint 9 — Reputation + XP ✅

- [x] XP events (idempotent)
- [x] Levels (config-driven curve)
- [x] Reputation events (Bayesian smoothing)
- [x] Public reputation label
- [x] Verified contributions on profile

## Sprint 10 — AI Copilot ✅

- [x] Provider abstraction (`lib/ai/provider.ts`)
- [x] Match explanation (deterministic + AI narration)
- [x] Project plan from description
- [x] Weekly summary
- [x] Gap analysis (deterministic)

## Sprint 11 — Quality ✅

- [x] Responsive design
- [x] Empty / loading / error states
- [x] Rate limiting
- [x] RLS policies
- [x] Unit tests (matching, gamification, transitions, utils, match-explanation)
- [x] Server-side permission checks
- [x] Analytics events

## Sprint 12 — Private Beta 🔄

- [x] Seed data (30 profiles, 20 projects, 15 roles, 10 matches, 4 trials, 5 clans)
- [x] README, docs (PRODUCT, ARCHITECTURE, MATCHING, REPUTATION, SECURITY)
- [ ] Critical E2E flow (Playwright)
- [ ] Real beta cohort

---

## Phases 6-8 — Clans / Builder League / AI (deferred)

Per the master plan, these are post-MVP. Feature-flagged:

- `FEATURE_CLANS` — Clan shell visible when true
- `FEATURE_LEADERBOARD` — Leaderboard shell visible when true
- `FEATURE_CHALLENGES` — Sponsored challenges

All schema, types, and helper hooks are in place; UI surfaces are gated.
