/**
 * XP award helpers.
 *
 * Master plan §38: "Aynı eylem sonsuz farm edilememeli." Idempotency is
 * enforced by the unique constraint on xp_events (event_type + entity_id
 * + idempotency_key). The award function returns false if the event already
 * existed.
 *
 * Reads/writes from the active data store (Supabase or in-memory).
 */

import { db, ensureSeeded } from '@/lib/db/store';
import { XP_REWARDS, XP_IDEMPOTENCY_KEY, DAILY_LOGIN_XP_CAP_PER_30_DAYS, LEVEL_THRESHOLDS } from '@/config/gamification';
import type { XpEventType } from '@/config/constants';

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
  _supabase: unknown, // legacy arg kept for call-site compatibility
  input: AwardInput,
): Promise<AwardResult> {
  await ensureSeeded();
  const xp = XP_REWARDS[input.eventType];
  if (xp == null) return { awarded: false, xp: 0, reason: 'unknown_event' };

  const idem = input.idempotencyKey ?? computeDefaultIdempotencyKey(input);

  // Daily-login cap check
  if (input.eventType === 'DAILY_LOGIN') {
    const since = new Date(Date.now() - DAILY_LOGIN_WINDOW_MS).toISOString();
    const recent = db.xp_events
      .all()
      .filter(
        (e) => e.user_id === input.userId && e.event_type === 'DAILY_LOGIN' && e.created_at >= since,
      );
    const recentSum = recent.reduce((s, r) => s + (r.xp_amount ?? 0), 0);
    if (recentSum + xp > DAILY_LOGIN_XP_CAP_PER_30_DAYS) {
      return { awarded: false, xp, reason: 'daily_login_cap_reached' };
    }
  }

  // Idempotency: check existing
  const existing = db.xp_events
    .all()
    .find((e) => e.idempotency_key === idem);
  if (existing) {
    return { awarded: false, xp, reason: 'duplicate' };
  }

  // Insert the event
  db.xp_events.insert({
    user_id: input.userId,
    event_type: input.eventType,
    entity_type: input.entityType ?? null,
    entity_id: input.entityId ?? null,
    idempotency_key: idem,
    xp_amount: xp,
    created_at: new Date().toISOString(),
  });

  // Bump aggregate on profile
  const profile = db.profiles.get(input.userId);
  if (profile) {
    const nextXp = (profile.builder_xp ?? 0) + xp;
    const nextLevel = levelForXp(nextXp);
    db.profiles.update(input.userId, { builder_xp: nextXp, builder_level: nextLevel });
  }

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

function levelForXp(xp: number): number {
  let level = 1;
  for (const [lvl, threshold] of LEVEL_THRESHOLDS.entries()) {
    if (xp >= threshold) level = lvl;
    else break;
  }
  return level;
}
