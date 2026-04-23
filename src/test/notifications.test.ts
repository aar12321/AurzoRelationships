import { describe, expect, it, beforeEach, vi } from 'vitest';
import type { Notification } from '@/types/core';

vi.mock('@/services/notificationsService', () => ({
  listNotifications: vi.fn().mockResolvedValue([]),
  markRead: vi.fn().mockResolvedValue(undefined),
  markAllRead: vi.fn().mockResolvedValue(undefined),
  dismiss: vi.fn().mockResolvedValue(undefined),
  subscribeToNotifications: vi.fn().mockReturnValue(() => {}),
}));

import { useNotificationsStore } from '@/stores/notificationsStore';

function mk(id: string, read = false): Notification {
  return {
    id,
    user_id: 'u',
    app_id: 'relationship_os',
    title: `n${id}`,
    body: null,
    action_url: null,
    priority: 'normal',
    category: null,
    read_at: read ? new Date().toISOString() : null,
    sent_at: new Date().toISOString(),
  };
}

beforeEach(() => {
  useNotificationsStore.setState({ items: [], loading: false });
});

describe('notificationsStore', () => {
  it('prepend adds a new item at the top', () => {
    const { prepend } = useNotificationsStore.getState();
    prepend(mk('1'));
    prepend(mk('2'));
    expect(useNotificationsStore.getState().items.map((n) => n.id)).toEqual(['2', '1']);
  });

  it('prepend dedupes on id', () => {
    const { prepend } = useNotificationsStore.getState();
    prepend(mk('1'));
    prepend(mk('1'));
    expect(useNotificationsStore.getState().items).toHaveLength(1);
  });

  it('unreadCount counts items without a read_at timestamp', () => {
    useNotificationsStore.setState({
      items: [mk('1'), mk('2', true), mk('3')],
    });
    expect(useNotificationsStore.getState().unreadCount()).toBe(2);
  });

  it('markRead stamps read_at optimistically', async () => {
    useNotificationsStore.setState({ items: [mk('1'), mk('2')] });
    await useNotificationsStore.getState().markRead('1');
    const items = useNotificationsStore.getState().items;
    expect(items.find((n) => n.id === '1')?.read_at).not.toBeNull();
    expect(items.find((n) => n.id === '2')?.read_at).toBeNull();
  });

  it('dismiss removes the item from the list', async () => {
    useNotificationsStore.setState({ items: [mk('1'), mk('2')] });
    await useNotificationsStore.getState().dismiss('1');
    expect(useNotificationsStore.getState().items.map((n) => n.id)).toEqual(['2']);
  });

  it('markAllRead stamps read_at on every unread item', async () => {
    useNotificationsStore.setState({
      items: [mk('1'), mk('2', true), mk('3')],
    });
    await useNotificationsStore.getState().markAllRead('u');
    expect(useNotificationsStore.getState().unreadCount()).toBe(0);
  });
});
