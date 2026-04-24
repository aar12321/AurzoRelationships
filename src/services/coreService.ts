import { coreClient } from './supabase';
import type {
  AppAccess,
  AurzoApp,
  AurzoAppId,
  AurzoProfile,
  Entitlement,
  Notification,
} from '@/types/core';

const APP_ID: AurzoAppId = 'relationship_os';

export async function getMyProfile(): Promise<AurzoProfile | null> {
  const { data, error } = await coreClient
    .from('profiles')
    .select('*')
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return (data as AurzoProfile | null) ?? null;
}

export async function updateMyProfile(
  patch: Partial<AurzoProfile>,
  userId: string,
): Promise<AurzoProfile> {
  const { data, error } = await coreClient
    .from('profiles')
    .update(patch)
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data as AurzoProfile;
}

export async function listApps(): Promise<AurzoApp[]> {
  const { data, error } = await coreClient
    .from('apps')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');
  if (error) throw error;
  return (data ?? []) as AurzoApp[];
}

export async function myAppAccess(): Promise<AppAccess[]> {
  const { data, error } = await coreClient.from('app_access').select('*');
  if (error) throw error;
  return (data ?? []) as AppAccess[];
}

export async function touchAppUsage(userId: string): Promise<void> {
  await coreClient
    .from('app_access')
    .update({ last_used_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('app_id', APP_ID);
}

// Feature-tour persistence lives in app_access.preferences (a jsonb bag scoped
// to { user_id, app_id } with RLS already locked to auth.uid()). We never put
// tour state in localStorage — it must travel with the user across devices.
const TOUR_PREFS_KEY = 'tour_seen_at';

export async function getTourSeenAt(): Promise<string | null> {
  const { data, error } = await coreClient
    .from('app_access')
    .select('preferences')
    .eq('app_id', APP_ID)
    .maybeSingle();
  if (error) throw error;
  const prefs = (data?.preferences ?? {}) as Record<string, unknown>;
  const v = prefs[TOUR_PREFS_KEY];
  return typeof v === 'string' ? v : null;
}

export async function markTourSeen(userId: string): Promise<void> {
  // Read-modify-write so we don't clobber any sibling preference keys
  // another feature may have written to the same row.
  const { data } = await coreClient
    .from('app_access')
    .select('preferences')
    .eq('user_id', userId)
    .eq('app_id', APP_ID)
    .maybeSingle();
  const prev = (data?.preferences ?? {}) as Record<string, unknown>;
  const next = { ...prev, [TOUR_PREFS_KEY]: new Date().toISOString() };
  await coreClient
    .from('app_access')
    .update({ preferences: next })
    .eq('user_id', userId)
    .eq('app_id', APP_ID);
}

export async function clearTourSeen(userId: string): Promise<void> {
  // "Retake Tour" in Settings — drop the key so the tour fires again.
  const { data } = await coreClient
    .from('app_access')
    .select('preferences')
    .eq('user_id', userId)
    .eq('app_id', APP_ID)
    .maybeSingle();
  const prev = (data?.preferences ?? {}) as Record<string, unknown>;
  const { [TOUR_PREFS_KEY]: _, ...rest } = prev;
  await coreClient
    .from('app_access')
    .update({ preferences: rest })
    .eq('user_id', userId)
    .eq('app_id', APP_ID);
}

export async function myEntitlements(): Promise<Entitlement[]> {
  const { data, error } = await coreClient.from('entitlements').select('*');
  if (error) throw error;
  return (data ?? []) as Entitlement[];
}

export async function logActivity(
  userId: string,
  kind: string,
  title?: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  await coreClient.from('activity_log').insert({
    user_id: userId,
    app_id: APP_ID,
    kind,
    title: title ?? null,
    metadata: metadata ?? {},
  });
}

export async function listNotifications(): Promise<Notification[]> {
  const { data, error } = await coreClient
    .from('notifications')
    .select('*')
    .is('dismissed_at', null)
    .order('sent_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as Notification[];
}

export async function markNotificationRead(id: string): Promise<void> {
  await coreClient
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id);
}
