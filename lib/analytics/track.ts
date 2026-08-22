/**
 * Analytics — minimal in-app event tracker.
 *
 * Master plan §88: funnel events (signup → project → match → trial →
 * shipped). Server actions call trackEvent(). No external service required
 * for the offline demo; the events go into a database table when
 * NEXT_PUBLIC_ANALYTICS_ENABLED is true.
 *
 * The client-side wrapper in components/analytics/track-button.tsx uses
 * the same shape.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { AnalyticsEvent } from '@/config/gamification';
import { getEnv } from '@/lib/env';

type DB = SupabaseClient<unknown>;

export async function trackEvent(
  supabase: DB | null,
  event: AnalyticsEvent,
  properties?: Record<string, unknown>,
  userId?: string,
) {
  const env = getEnv();
  if (!env.NEXT_PUBLIC_ANALYTICS_ENABLED) return; // no-op
  if (!supabase) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('analytics_events').insert({
      event,
      user_id: userId ?? null,
      properties: properties ?? {},
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[analytics] trackEvent failed:', err);
  }
}
