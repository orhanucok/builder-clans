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
 *   score = clamp( INITIAL * prior_weight + sum(delta * weight) )
 *                   / ( prior_weight + count )           → normalized to 0..100
 *
 * This module is server-only.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { REPUTATION } from '@/config/gamification';
import type { ReputationSource } from '@/config/constants';
import type { Database } from '@/types/database';

type DB = SupabaseClient<Database>;

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
  supabase: DB,
  input: ReputationEventInput,
): Promise<{ newScore: number }> {
  const bounded = Math.max(
    REPUTATION.MIN,
    Math.min(REPUTATION.MAX, Math.round(input.delta * Math.max(0.1, input.weight))),
  );

  // Idempotency: if a (user, source, source_id) already exists, do not double-apply.
  if (input.sourceId) {
    const { data: existing } = await supabase
      .from('reputation_events')
      .select('id')
      .eq('user_id', input.userId)
      .eq('source', input.source)
      .eq('source_id', input.sourceId)
      .maybeSingle();
    if (existing) {
      const score = await recomputeReputation(supabase, input.userId);
      return { newScore: score };
    }
  }

  await supabase.from('reputation_events').insert({
    user_id: input.userId,
    source: input.source,
    source_id: input.sourceId ?? null,
    source_type: input.sourceType ?? null,
    delta: bounded,
    weight: input.weight,
    reason: input.reason,
  });

  const score = await recomputeReputation(supabase, input.userId);
  return { newScore: score };
}

/**
 * Recompute reputation_score on the profile from the event log + prior.
 */
export async function recomputeReputation(
  supabase: DB,
  userId: string,
): Promise<number> {
  const { data: events } = await supabase
    .from('reputation_events')
    .select('delta, weight')
    .eq('user_id', userId);

  const list = (events ?? []) as Array<{ delta: number; weight: number }>;
  const prior = REPUTATION.INITIAL;
  const priorWeight = REPUTATION.SMOOTHING_PRIOR_WEIGHT;
  const observedWeight = list.length;
  const totalWeight = priorWeight + observedWeight;
  const observed = list.reduce((s, e) => s + (e.delta ?? 0) * (e.weight ?? 1), 0);
  const raw = (prior * priorWeight + observed) / Math.max(1, totalWeight);
  const score = Math.max(REPUTATION.MIN, Math.min(REPUTATION.MAX, Math.round(raw)));

  await supabase
    .from('profiles')
    .update({ reputation_score: score })
    .eq('id', userId);

  return score;
}
