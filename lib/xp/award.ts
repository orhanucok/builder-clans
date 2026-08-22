/**
 * XP award helpers.
 *
 * Master plan §38: "Aynı eylem sonsuz farm edilememeli." Idempotency is
 * enforced by the unique constraint on xp_events (event_type + entity_id
 * + idempotency_key). The award function returns false if the event already
 * existed.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { XP_REWARDS, XP_IDEMPOTENCY_KEY, DAILY_LOGIN_XP_CAP_PER_30_DAYS } from '@/config/gamification';
import type { XpEventType } from '@/config/constants';
import type { Database } from '@/types/database';

type DB = SupabaseClient<Database>;

export interface AwardInput {
  userId: string;
  eventType: XpEventType;
  entityType?: string;
  entityId?: string;
  idempotencyKey?: string;
}

export interface AwardResult {
  awarded: boolean;
  xp: number;
  reason?: string;
}

const DAILY_LOGIN_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Award XP for a one-time event. Returns whether the award happened.
 */
export async function awardXp(
  supabase: DB,
  input: AwardInput,
): Promise<AwardResult> {
  const xp = XP_REWARDS[input.eventType];
  if (xp == null) return { awarded: false, xp: 0, reason: 'unknown_event' };

  const idem = input.idempotencyKey ?? computeDefaultIdempotencyKey(input);

  // Daily-login cap check
  if (input.eventType === 'DAILY_LOGIN') {
    const since = new Date(Date.now() - DAILY_LOGIN_WINDOW_MS).toISOString();
    const { data: recent } = await supabase
      .from('xp_events')
      .select('xp_amount')
      .eq('user_id', input.userId)
      .eq('event_type', 'DAILY_LOGIN')
      .gte('created_at', since);
    const recentSum = (recent ?? []).reduce((s, r) => s + (r.xp_amount ?? 0), 0);
    if (recentSum + xp > DAILY_LOGIN_XP_CAP_PER_30_DAYS) {
      return { awarded: false, xp, reason: 'daily_login_cap_reached' };
    }
  }

  // Try insert; unique constraint will throw if duplicate.
  const { error } = await supabase.from('xp_events').insert({
    user_id: input.userId,
    event_type: input.eventType,
    entity_type: input.entityType ?? null,
    entity_id: input.entityId ?? null,
    idempotency_key: idem,
    xp_amount: xp,
  });

  if (error) {
    // Duplicate (23505) → already awarded
    if (error.code === '23505' || /duplicate key/i.test(error.message)) {
      return { awarded: false, xp, reason: 'duplicate' };
    }
    throw error;
  }

  // Bump aggregate on profile
  await supabase.rpc('increment_profile_xp', {
    p_user_id: input.userId,
    p_xp_delta: xp,
  });

  return { awarded: true, xp };
}

function computeDefaultIdempotencyKey(input: AwardInput): string {
  const base = XP_IDEMPOTENCY_KEY[input.eventType];
  if (base === null) {
    return `${input.eventType}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
  if (input.entityId) return `${base}-${input.entityId}`;
  return base;
}
