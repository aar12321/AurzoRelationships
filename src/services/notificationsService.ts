import { coreClient, supabase } from './supabase';
import type { Notification } from '@/types/core';

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
