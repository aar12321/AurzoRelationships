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
