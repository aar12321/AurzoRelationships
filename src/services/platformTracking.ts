// Auto-generated: unified Aurzo platform tracking.
// All Aurzo apps share one Supabase project (auth.users is shared), so a single
// login powers every platform. This helper logs clicks + activity into the
// shared tracking tables so morning-growth-loop can see which platforms each
// user actually uses.
import { supabase } from './supabase';

export const AURZO_PLATFORM = 'relationships' as const;

type TrackingMeta = Record<string, unknown>;



/**
 * Log a click on this platform (from a hub tile, nav, deeplink, push, etc.).
 * Silently no-ops if the user is not signed in or the client is not configured.
 */
export async function trackPlatformClick(
  source?: string,
  metadata: TrackingMeta = {},
): Promise<void> {
  const client = supabase ?? null;
  if (!client) return;
  try {
    await client.schema('public').rpc('log_platform_click', {
      p_platform: AURZO_PLATFORM,
      p_source: source ?? null,
      p_metadata: metadata,
    });
  } catch (err) {
    if (typeof console !== 'undefined') {
      console.debug('[aurzo] trackPlatformClick failed', err);
    }
  }
}

/**
 * Log a semantic activity inside this platform (e.g. 'recipe_saved',
 * 'workout_logged', 'trip_created'). Morning-Growth-Loop aggregates these
 * to drive "your most-used app" surfaces.
 */
export async function trackPlatformActivity(
  action: string,
  metadata: TrackingMeta = {},
): Promise<void> {
  const client = supabase ?? null;
  if (!client) return;
  try {
    await client.schema('public').rpc('log_platform_activity', {
      p_platform: AURZO_PLATFORM,
      p_action: action,
      p_metadata: metadata,
    });
  } catch (err) {
    if (typeof console !== 'undefined') {
      console.debug('[aurzo] trackPlatformActivity failed', err);
    }
  }
}

/**
 * Check whether the current user can access a given platform (defaults to
 * this app). Uses the unified entitlement engine that morning-growth-loop
 * keeps in sync with Stripe.
 */
export async function hasPlatformAccess(
  platform: string = AURZO_PLATFORM,
): Promise<boolean> {
  const client = supabase ?? null;
  if (!client) return false;
  try {
    const { data } = await client.schema('public').rpc('me_has_platform_access', {
      p_platform: platform,
    });
    return Boolean(data);
  } catch {
    return false;
  }
}
