/**
 * Builder Clans — Gamification Configuration
 *
 * Centralized XP rewards, level thresholds, reputation bounds.
 * Master plan §38-§40: "magic numbers config'te olsun. XP değerleri config'te olsun."
 *
 * Anti-farming is enforced via idempotency in the XP event log (DB unique
 * constraints). The numbers here describe the *reward* for each action.
 */

import type { XpEventType, ReputationSource } from './constants';

// ---------------------------------------------------------------------------
// XP rewards per event
// ---------------------------------------------------------------------------

export const XP_REWARDS: Record<XpEventType, number> = {
  PROFILE_COMPLETE: 20,
  FIRST_PROJECT: 20,
  TRIAL_COMPLETED: 50,
  SUCCESSFUL_COLLABORATION: 100,
  MILESTONE_COMPLETED: 75,
  VERIFIED_CONTRIBUTION: 50,
  PROJECT_SHIPPED: 500,
  HELP_ANOTHER_PROJECT: 50,
  DAILY_LOGIN: 5,
  REFERRAL_JOINED: 75,
};

// Daily login is bounded — only the *first* login of a day awards XP.
// (Enforced in lib/xp/award-daily-login.ts)
export const DAILY_LOGIN_XP_CAP_PER_30_DAYS = 150;

// Trial-related events: max 1 successful collaboration per trial pair.
export const SUCCESSFUL_COLLABORATION_UNIQUE_PER_TRIAL = true;

// ---------------------------------------------------------------------------
// XP event idempotency keys
// ---------------------------------------------------------------------------

/**
 * Maps an event type to the key used to dedupe the event.
 * A value of `null` means the event is always awardable (e.g. profile
 * complete can be re-triggered if profile fields are added/removed).
 */
export const XP_IDEMPOTENCY_KEY: Record<XpEventType, string | null> = {
  PROFILE_COMPLETE: 'profile-complete',
  FIRST_PROJECT: 'first-project',
  TRIAL_COMPLETED: 'trial', // + trial id
  SUCCESSFUL_COLLABORATION: 'collab', // + trial id
  MILESTONE_COMPLETED: 'milestone', // + milestone id
  VERIFIED_CONTRIBUTION: 'contribution', // + contribution id
  PROJECT_SHIPPED: 'project-ship', // + project id
  HELP_ANOTHER_PROJECT: null, // free-form; rely on anti-fraud heuristics
  DAILY_LOGIN: 'daily-login', // + ISO date
  REFERRAL_JOINED: 'referral', // + referred user id
};

// ---------------------------------------------------------------------------
// Level thresholds (cumulative XP required to reach level N)
// ---------------------------------------------------------------------------

/**
 * Master plan §39:
 *   L1 = 0, L2 = 100, L3 = 250, L4 = 500, L5 = 900, L6 = 1400, L7 = 2000, ...
 *
 * The curve is accelerating but not quadratic. We keep an explicit table —
 * the master plan says "Formula/config tablosundan yönetilebilir" (the curve
 * is a config). To change the curve, edit LEVEL_THRESHOLDS below; the
 * `xpToReachLevel` function does a binary search on this table.
 */
export const LEVEL_THRESHOLDS: number[] = [
  0,      // L1
  100,    // L2
  250,    // L3
  500,    // L4
  900,    // L5
  1400,   // L6
  2000,   // L7
  2800,   // L8
  3800,   // L9
  5000,   // L10
  6500,   // L11
  8200,   // L12
  10000,  // L13
  12000,  // L14
  14500,  // L15
  17500,  // L16
  21000,  // L17
  25000,  // L18
  29500,  // L19
  35000,  // L20
  42000,  // L21
  50000,  // L22
  60000,  // L23
  72000,  // L24
  86000,  // L25
];

/**
 * Cumulative XP required to reach the given level. The list is 0-indexed
 * (`xpToReachLevel(1) === 0`). Beyond the last defined level, we extrapolate
 * with the same growth rate (~+14k XP per level).
 */
export function xpToReachLevel(level: number): number {
  if (level <= 1) return 0;
  if (level - 1 < LEVEL_THRESHOLDS.length) {
    return LEVEL_THRESHOLDS[level - 1];
  }
  // Extrapolation: keep the last delta and grow by 10% per level
  const last = LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  const prev = LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 2];
  let lastDelta = last - prev;
  let total = last;
  for (let l = LEVEL_THRESHOLDS.length + 1; l <= level; l++) {
    lastDelta = lastDelta * 1.1;
    total += lastDelta;
  }
  return Math.round(total);
}

/**
 * Given total XP, return the user's current level (>= 1).
 */
export function levelFromXp(xp: number): number {
  if (xp <= 0) return 1;
  // Binary search across LEVEL_THRESHOLDS
  let lo = 1,
    hi = LEVEL_THRESHOLDS.length;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (xpToReachLevel(mid) <= xp) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

/**
 * Given total XP, return the progress through the current level.
 */
export function levelProgress(xp: number): {
  current: number;
  nextLevel: number;
  progress: number;
  xpInLevel: number;
  xpToNext: number;
} {
  const current = levelFromXp(xp);
  const nextLevel = current + 1;
  const xpThis = xpToReachLevel(current);
  const xpNext = xpToReachLevel(nextLevel);
  const xpInLevel = Math.max(0, xp - xpThis);
  const xpToNext = Math.max(0, xpNext - xp);
  const span = xpNext - xpThis;
  return {
    current,
    nextLevel,
    progress: span > 0 ? Math.min(1, xpInLevel / span) : 1,
    xpInLevel,
    xpToNext,
  };
}

// ---------------------------------------------------------------------------
// Reputation
// ---------------------------------------------------------------------------

export const REPUTATION = {
  INITIAL: 50,
  MIN: 0,
  MAX: 100,

  // Per-source deltas (weighted by peer review weight + prior reputation).
  // The actual delta is computed in lib/reputation/apply-event.ts using
  // a Bayesian-style smoothing. These are *max impact* values.
  MAX_DELTA: {
    TRIAL_SUCCESS: 6,
    TRIAL_PARTICIPATED: 1,
    TRIAL_NO_SHOW: -10,
    PEER_REVIEW: 3,            // positive reviews use this; weight=1 unless capped
    PROJECT_SHIPPED: 4,
    COMMITMENT_BREACH: -8,
    MALICIOUS_REPORT: -15,
    INITIAL: 0,
  } as const satisfies Record<ReputationSource, number>,

  // Smoothing — number of prior trials/reviews to consider "established".
  // With 8 reviews, a single bad review shifts the score by ~1/9 * max_delta.
  SMOOTHING_PRIOR_WEIGHT: 8,

  // Public label thresholds
  PUBLIC_LABELS: {
    NEW: { min: 0, label: 'New' },
    BUILDING: { min: 40, label: 'Building Trust' },
    RELIABLE: { min: 60, label: 'Reliable' },
    HIGHLY_RELIABLE: { min: 75, label: 'Highly Reliable' },
    TOP_BUILDER: { min: 88, label: 'Top Builder' },
  } as const,
} as const;

export function publicReputationLabel(score: number): string {
  const entries = Object.entries(REPUTATION.PUBLIC_LABELS).sort(
    (a, b) => Number(b[1].min) - Number(a[1].min),
  );
  for (const [, def] of entries) {
    if (score >= def.min) return def.label;
  }
  return 'New';
}

// ---------------------------------------------------------------------------
// Funnel events for analytics (master plan §88)
// ---------------------------------------------------------------------------

export const ANALYTICS_EVENTS = [
  'signup_completed',
  'onboarding_completed',
  'project_created',
  'project_viewed',
  'role_created',
  'application_sent',
  'invite_sent',
  'match_created',
  'match_accepted',
  'trial_started',
  'trial_completed',
  'trial_successful',
  'task_completed',
  'milestone_completed',
  'project_shipped',
] as const;
export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[number];
