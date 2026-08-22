# Reputation

Reputation is the **trust** score attached to a user. It is **public, but
coarse-grained** — the per-criterion ratings are private.

## Range

`reputation_score` ∈ [0, 100]. Default: 50.

## Sources

`lib/reputation/apply-event.ts` records deltas with a source and a weight. The
final score is recomputed from the event log with a Bayesian-style smoothing.

| Source | Max impact | Notes |
|---|---|---|
| `INITIAL` | — | Sets prior to 50 |
| `TRIAL_SUCCESS` | +6 | Awarded when a trial ends successfully |
| `TRIAL_PARTICIPATED` | +1 | Awarded for any active participation |
| `TRIAL_NO_SHOW` | -10 | Awarded for accepted trial + zero participation |
| `PEER_REVIEW_POSITIVE` | +3 | Avg ≥ 4 AND `would_work_again = YES` |
| `PEER_REVIEW_NEGATIVE` | -4 | Avg ≤ 2 OR `would_work_again = NO` |
| `PROJECT_SHIPPED` | +4 | Awarded to every team member on ship |
| `COMMITMENT_BREACH` | -8 | Reserved for repeated broken commitments |
| `MALICIOUS_REPORT` | -15 | Reserved for confirmed abuse |

## Smoothing

A single bad review cannot tank a reputation. The formula:

```
score = (INITIAL * prior_weight + sum(delta * weight)) / (prior_weight + count)
```

where `prior_weight = 8` and `INITIAL = 50`. With 8 prior-weight units, a single
`+3` event changes the score by ~`3 * weight / 16 ≈ 0.2`. A storm of 10 negative
reviews shifts the score by ~`10 * -4 * weight / 18 ≈ -2.2`.

## Public labels

| Score | Label |
|---|---|
| 0–39 | New |
| 40–59 | Building Trust |
| 60–74 | Reliable |
| 75–87 | Highly Reliable |
| 88+ | Top Builder |

Private detail (per-criterion ratings) is never displayed publicly.

## Recomputation

`recompute_reputation(p_user_id)` is a SQL function that recomputes the score
from the event log. It runs after every event write. There is no in-place
incremental model — we always start from the log, which makes the system easy
to audit and backfill.
