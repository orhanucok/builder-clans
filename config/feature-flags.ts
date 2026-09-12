/**
 * Builder Clans — Feature Flags
 *
 * Master plan §113: ship with feature flags so the product can be deployed
 * without exposing unfinished surfaces.
 *
 * Flags can be overridden at runtime via the FEATURE_* env vars (see
 * .env.example) and toggled per-user in the future via a `feature_overrides`
 * table. This module exposes a single `isFeatureEnabled()` helper that
 * components call — they don't read process.env directly.
 */

export type FeatureFlag =
  | 'AI_FEATURES'
  | 'CLANS'
  | 'LEADERBOARD'
  | 'CHALLENGES'
  | 'NATIVE_CHAT'
  | 'GITHUB_INTEGRATION';

const ENV_MAP: Record<FeatureFlag, string | undefined> = {
  AI_FEATURES: process.env.FEATURE_AI,
  CLANS: process.env.FEATURE_CLANS,
  LEADERBOARD: process.env.FEATURE_LEADERBOARD,
  CHALLENGES: process.env.FEATURE_CHALLENGES,
  NATIVE_CHAT: process.env.FEATURE_NATIVE_CHAT,
  GITHUB_INTEGRATION: process.env.FEATURE_GITHUB_INTEGRATION,
};

const DEFAULTS: Record<FeatureFlag, boolean> = {
  AI_FEATURES: true,
  CLANS: true,
  LEADERBOARD: true,
  CHALLENGES: true,
  NATIVE_CHAT: true,
  GITHUB_INTEGRATION: false,
};

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  const raw = ENV_MAP[flag];
  if (raw === undefined) return DEFAULTS[flag];
  return raw === 'true' || raw === '1';
}

export function getAllFeatureFlags(): Record<FeatureFlag, boolean> {
  const result = {} as Record<FeatureFlag, boolean>;
  (Object.keys(DEFAULTS) as FeatureFlag[]).forEach((f) => {
    result[f] = isFeatureEnabled(f);
  });
  return result;
}
