# Product rules

> Adapted from the master plan. This file is the operational summary for engineering.

## North Star

> **Shipped projects.**

Engagement is not the goal. Messages, logins, profiles — none of them matter unless they
end in real, collaborative output.

## Product principles (locked)

1. Project-first, profile-second.
2. Trial Sprint before team.
3. Reputation is output, not activity.
4. Clan ≠ Project.
5. AI is a narrator, not a judge.
6. Modularity over premature distribution.

## State machines

All status transitions live in `config/transitions.ts` and are enforced server-side
**and** in the database via RLS.

| Machine | States |
|---|---|
| Match | SUGGESTED → INVITED/APPLIED → MUTUAL → TRIAL_STARTED |
| Trial | DRAFT → ACTIVE → COMPLETED → SUCCESSFUL/ENDED/EXPIRED |
| Project member | ACTIVE → LEFT/REMOVED |
| Application | PENDING → ACCEPTED/REJECTED/WITHDRAWN |
| Milestone | PLANNED → IN_PROGRESS → COMPLETED/BLOCKED/CANCELLED |
| Task | TODO → IN_PROGRESS → DONE/BLOCKED |

## XP & reputation

- XP: gamification, idempotent per `event_type + entity_id` (see `config/gamification.ts`).
- Reputation: Bayesian-smoothed, range 0–100, recomputable from event log.
- Both are public, in aggregate form. Private peer-rating detail is never public.

## Things we will NOT build (V1)

- Native video calling
- Custom voice infrastructure
- Full Slack/Discord clone
- Full Linear alternative
- Payments / escrow
- Equity agreements
- Crypto / tokens / NFTs
- AI agents autonomously modifying projects
- Native mobile app

If a feature request lands in those categories, redirect to first principles: does
this help a builder find the right person and ship a real project? If no, defer.
