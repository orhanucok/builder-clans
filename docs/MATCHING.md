# Matching

The matching engine is **deterministic, weighted, and configurable**. The AI
may write an explanation, but it does **not** invent a score.

## Input

- A `project` (with required skills, tags, commitment, remote mode)
- An optional `role` (with its own required skills and title)
- A `candidate` profile (with skills, interests, weekly_hours, remote_preference,
  user_type, reputation_score)

## Score

The final score is a weighted sum of eight sub-scores, all in [0, 1], then
rounded to 0..100.

```
final = 0.30 * skill
      + 0.15 * interest
      + 0.15 * role
      + 0.15 * availability
      + 0.10 * commitment
      + 0.05 * experience
      + 0.05 * location
      + 0.05 * reputation
```

All weights live in `config/matching.ts` (`MATCH_WEIGHTS`). The sum is enforced
in code via `MATCH_WEIGHT_SUM`.

## Sub-scores

| Sub-score | Source |
|---|---|
| `skill` | Fraction of required skills (project + role) the candidate has, after canonicalization |
| `interest` | Jaccard similarity of candidate interests vs. project tags |
| `role` | Fraction of role-title-derived skills the candidate has |
| `availability` | Overlap of candidate weekly hours bucket with required h/week |
| `commitment` | Same as availability (kept separate to allow future tuning) |
| `experience` | Static map from `user_type` to a 0..1 value |
| `location` | Function of project remote mode + candidate remote preference + same country/city |
| `reputation` | `reputation_score / 100` |

## Hard filters

Before scoring, candidates are excluded if:

- They are the project owner
- They are already an active project member
- Their `reputation_score` is below `MATCH_HARD_FILTERS.minReputation` (20 by default)

## Skill canonicalization

Free-text skills are normalized through `SYNONYM_MAP` and matched against the
canonical list in `CANONICAL_SKILLS`. Synonyms (e.g. `ML` → `Machine Learning`,
`ROS2` → `ROS`, `CV` → `Computer Vision`) are resolved before scoring.

## AI narration

After the deterministic score is computed, `lib/ai/features.ts:aiMatchExplanation`
asks the AI provider to write a 1-paragraph explanation + bullet points. The
deterministic version is always available as a fallback.

The AI is given the score and breakdown as part of the prompt. The AI prompt
explicitly says: *do not invent scores*. This is enforced at the prompt level
because the score is the source of truth.

## Future

- Embedding-based skill/interests similarity
- Collaborative filtering from successful collaborations
- Team compatibility from past trials
- Project similarity for better For-You feed

These are deferred to V2; V1 keeps the system explainable and testable.
