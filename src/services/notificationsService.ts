import { coreClient, supabase } from './supabase';
import type {
  AurzoAppId, Notification, NotificationChannel, NotificationPref,
} from '@/types/core';

const DEFAULT_APP: AurzoAppId = 'relationship_os';
const DEFAULT_CATEGORY = 'default';

export async function listNotifications(limit = 50): Promise<Notification[]> {
  const { data, error } = await coreClient
    .from('notifications')
    .select('*')
    .is('dismissed_at', null)
    .order('sent_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as Notification[];
}

export async function markRead(id: string): Promise<void> {
  const { error } = await coreClient
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function markAllRead(userId: string): Promise<void> {
  const { error } = await coreClient
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('read_at', null);
  if (error) throw error;
}

export async function dismiss(id: string): Promise<void> {
  const { error } = await coreClient
    .from('notifications')
    .update({ dismissed_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

// ---------- preferences ----------
// Read all per-channel prefs for the current user (default category).
// Returns rows that exist; the caller is responsible for treating absent
// rows as "default on" — we don't materialize default rows on read so
// there's no hidden write side-effect.
export async function listNotificationPrefs(): Promise<NotificationPref[]> {
  const { data, error } = await coreClient
    .from('notification_prefs')
    .select('*')
    .eq('app_id', DEFAULT_APP)
    .eq('category', DEFAULT_CATEGORY);
  if (error) throw error;
  return (data ?? []) as NotificationPref[];
}

export async function setChannelEnabled(
  userId: string,
  channel: NotificationChannel,
  enabled: boolean,
): Promise<void> {
  const { error } = await coreClient
    .from('notification_prefs')
    .upsert(
      {
        user_id: userId,
        channel,
        app_id: DEFAULT_APP,
        category: DEFAULT_CATEGORY,
        enabled,
      },
      { onConflict: 'user_id,channel,app_id,category' },
    );
  if (error) throw error;
}

// Quiet hours apply across every channel for this user. We write the
// same start/end to every existing channel row so the edge fn that
// dispatches a notification can read just the row it cares about.
// First-time users who haven't toggled anything yet get a row created
// for in_app (the always-on default channel) so the prefs are persisted.
export async function setQuietHours(
  userId: string,
  start: string | null,
  end: string | null,
): Promise<void> {
  const existing = await listNotificationPrefs();
  const channels: NotificationChannel[] = existing.length > 0
    ? existing.map((p) => p.channel)
    : ['in_app'];
  const rows = channels.map((channel) => ({
    user_id: userId,
    channel,
    app_id: DEFAULT_APP,
    category: DEFAULT_CATEGORY,
    enabled: existing.find((p) => p.channel === channel)?.enabled ?? true,
    quiet_hours_start: start,
    quiet_hours_end: end,
  }));
  const { error } = await coreClient
    .from('notification_prefs')
    .upsert(rows, { onConflict: 'user_id,channel,app_id,category' });
  if (error) throw error;
}

// Subscribe to realtime inserts so a fresh notification lights up the bell
// instantly without a page refresh. Returns an unsubscribe function.
export function subscribeToNotifications(
  userId: string,
  onInsert: (n: Notification) => void,
): () => void {
  const channel = supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'aurzo_core',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => onInsert(payload.new as Notification),
    )
    .subscribe();
  return () => { void supabase.removeChannel(channel); };
}
