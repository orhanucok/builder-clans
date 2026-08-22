/**
 * Reputation — apply events with Bayesian-style smoothing.
 *
 * Master plan §40: "tek kötü review reputation'ı mahvetmemelidir.
 * Weighted/bayesian-style smoothing uygulanmalıdır."
 *
 * Each event records a delta in reputation_events. The current score on
 * profiles.reputation_score is recomputed from the event log + an
 * initial prior (50). We do NOT do a per-mutation delta-additive model
 * because it amplifies early events.
 *
 * Formula:
 *   score = ( INITIAL * prior_weight + sum(delta * weight) )
 *                / ( prior_weight + count )              → normalized to 0..100
 *
 * This module is server-only.
 */

import { db, ensureSeeded } from '@/lib/db/store';
import { REPUTATION } from '@/config/gamification';
import type { ReputationSource } from '@/config/constants';

export interface ReputationEventInput {
  userId: string;
  source: ReputationSource;
  delta: number;
  weight: number;
  reason: string;
  sourceId?: string;
  sourceType?: string;
}

export async function applyReputationEvent(
  _supabase: unknown,
  input: ReputationEventInput,
): Promise<{ newScore: number }> {
  await ensureSeeded();
  const bounded = Math.max(
    REPUTATION.MIN,
    Math.min(REPUTATION.MAX, Math.round(input.delta * Math.max(0.1, input.weight))),
  );

  // Idempotency: if a (user, source, source_id) already exists, do not double-apply.
  if (input.sourceId) {
    const existing = db.reputation_events
      .all()
      .find(
        (e) => e.user_id === input.userId && e.source === input.source && e.source_id === input.sourceId,
      );
    if (existing) {
      const score = await recomputeReputation(input.userId);
      return { newScore: score };
    }
  }

  db.reputation_events.insert({
    user_id: input.userId,
    source: input.source,
    source_id: input.sourceId ?? null,
    source_type: input.sourceType ?? null,
    delta: bounded,
    weight: input.weight,
    reason: input.reason,
    created_at: new Date().toISOString(),
  });

  const score = await recomputeReputation(input.userId);
  return { newScore: score };
}

/**
 * Recompute reputation_score on the profile from the event log + prior.
 */
export async function recomputeReputation(
  _supabase: unknown,
  userId: string,
): Promise<number> {
  await ensureSeeded();
  const events = db.reputation_events.all().filter((e) => e.user_id === userId);
  const prior = REPUTATION.INITIAL;
  const priorWeight = REPUTATION.SMOOTHING_PRIOR_WEIGHT;
  const observedWeight = events.length;
  const totalWeight = priorWeight + observedWeight;
  const observed = events.reduce((s, e) => s + (e.delta ?? 0) * (e.weight ?? 1), 0);
  const raw = (prior * priorWeight + observed) / Math.max(1, totalWeight);
  const score = Math.max(REPUTATION.MIN, Math.min(REPUTATION.MAX, Math.round(raw)));

  db.profiles.update(userId, { reputation_score: score });

  return score;
}
