# Builder Clans

> **The network where the world builds.**

Builder Clans is a project-first collaboration platform. It helps serious builders
find the right collaborators, test how they work together in a 7-day Trial Sprint,
and turn real shipped work into reputation.

```
USER → PROFILE → PROJECT → OPEN ROLES → MATCH → MUTUAL ACCEPT
     → TRIAL SPRINT → TEAM → WORKSPACE → MILESTONES → SHIP
     → VERIFIED CONTRIBUTIONS → REPUTATION → BETTER MATCHES
```

This repository is the implementation of the master product plan. It is built to be
deployable as a **modular monolith** on **Vercel + Supabase** — no Kubernetes, no
microservice sprawl, no premature distribution.

---

## 🚀 Deploy to Vercel — 5 minutes

The app boots with the **in-memory data store** by default, so you can deploy a
fully working demo without provisioning Supabase first. Public URL, free SSL,
zero config.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/orhanucok/builder-clans&project-name=builder-clans&repository-name=builder-clans)

Step-by-step instructions in [`DEPLOY.md`](./DEPLOY.md).

---

## Highlights

- **Project-first discovery** — feed of projects, not people.
- **Hybrid matching** — deterministic scorer (`config/matching.ts`) with AI narration
  layered on top. Scores are computed in code; the AI only writes the explanation.
- **Trial Sprint** — the wedge. A 7-day focused collaboration before the team commits.
- **Project Room** — minimal but real: tasks (kanban), updates, chat, artifacts, AI.
- **Proof of work** — XP and reputation come from real outcomes, not engagement.
- **Feature-flagged** — Clans, Leaderboard, AI can be toggled per environment.

## Stack

- **Frontend:** Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, shadcn-style components, Radix UI primitives
- **Backend:** Next.js server actions, route handlers, Supabase
- **Database:** PostgreSQL (Supabase) — full RLS
- **Auth:** Supabase Auth (email/password; OAuth can be added)
- **AI:** provider abstraction in `lib/ai/` — pluggable OpenAI / Anthropic / mock
- **Hosting:** Vercel + Supabase

## Repository layout

```
builder-clans/
├── app/                       # Next.js App Router
│   ├── (auth)/                # login / signup
│   ├── (app)/                 # protected app shell
│   │   ├── discover/
│   │   ├── projects/
│   │   ├── projects/[slug]/
│   │   ├── projects/new/
│   │   ├── matches/
│   │   ├── trials/
│   │   ├── trials/[id]/
│   │   ├── workspace/[projectId]/
│   │   ├── onboarding/
│   │   ├── people/[username]/
│   │   ├── settings/
│   │   ├── notifications/
│   │   ├── clans/
│   │   └── leaderboard/
│   └── api/                   # route handlers (e.g. /api/ai/project-plan)
├── components/
│   ├── ui/                    # primitives (Button, Card, ...)
│   ├── layout/                # Sidebar, Topbar, SetupBanner
│   └── project/               # ProjectCard, etc.
├── config/                    # enums, matching weights, XP, status machines
├── lib/
│   ├── auth/                  # session helpers
│   ├── db/                    # supabase clients + queries
│   ├── validation/            # zod schemas
│   ├── permissions/           # server-side auth checks
│   ├── matching/              # candidate generation + explanations
│   ├── xp/                    # idempotent XP awards
│   ├── reputation/            # Bayesian-smoothed reputation
│   ├── ai/                    # provider abstraction + features
│   ├── analytics/             # event tracker
│   ├── rate-limit.ts
│   ├── env.ts                 # validated env
│   └── utils.ts
├── supabase/
│   ├── migrations/0001_init.sql
│   └── seed.sql
├── scripts/seed.ts            # local seed via admin API
├── tests/                     # vitest
├── types/                     # Database types
└── docs/                      # PRODUCT, ARCHITECTURE, MATCHING, REPUTATION
```

## Setup

### 1. Install dependencies

```bash
pnpm install   # or npm install / yarn
```

### 2. Configure environment

Copy `.env.example` to `.env.local` and fill in:

```bash
# Required for the real backend
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DATABASE_URL=postgresql://...

# AI (mock works offline; set AI_PROVIDER=openai + AI_API_KEY to use real AI)
AI_PROVIDER=mock
```

The app boots in **demo mode** without Supabase configured — pages render their
empty states. Add credentials to enable sign-up, projects, trials, etc.

### 3. Apply database migrations

Option A — Supabase CLI (recommended):

```bash
supabase start                  # local stack
supabase db push                # apply migrations
supabase db reset --linked      # full reset + seed (linked project)
```

Option B — manual:

```bash
psql $DATABASE_URL -f supabase/migrations/0001_init.sql
psql $DATABASE_URL -f supabase/seed.sql
```

### 4. Seed demo users (optional)

```bash
pnpm seed
```

This creates 30 demo accounts (`ahmet_yilmaz@builderclans.dev` / `builder-clans-demo-2026`,
etc.) via the Supabase admin API. Run the SQL `seed.sql` afterwards to attach
projects, roles, matches, and trials to those users.

### 5. Run

```bash
pnpm dev
```

Visit http://localhost:3000.

## Environment variables

See `.env.example`. All vars are validated at boot by `lib/env.ts`.

## Feature flags

| Flag | Default | Description |
|---|---|---|
| `FEATURE_AI` | `true` | AI features (match explanation, weekly summary, project plan) |
| `FEATURE_CLANS` | `false` | Clans section |
| `FEATURE_LEADERBOARD` | `false` | Leaderboard section |
| `FEATURE_CHALLENGES` | `false` | Sponsored challenges |
| `FEATURE_NATIVE_CHAT` | `true` | In-app project / trial chat |
| `FEATURE_GITHUB_INTEGRATION` | `false` | Repo sync |

## Testing

```bash
pnpm test           # vitest unit tests
pnpm test:e2e       # playwright (e2e critical flow)
```

The critical E2E test covers:

```
User A creates project
  → User B applies
    → User A accepts
      → Trial created
        → Trial completed
          → Both accept
            → User B becomes project member
              → XP & reputation updated
```

## Deployment

Vercel + Supabase. The Next.js build output is Vercel-native; the database is
Supabase-hosted Postgres with RLS. See `docs/DEPLOYMENT.md` for the production
checklist.

## Documentation

- `docs/PRODUCT.md` — product rules
- `docs/ARCHITECTURE.md` — system architecture
- `docs/MATCHING.md` — how matching works
- `docs/REPUTATION.md` — how reputation is computed
- `docs/SECURITY.md` — security model & RLS

## License

Proprietary. © Builder Clans.
