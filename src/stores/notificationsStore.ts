import { create } from 'zustand';
import type { Notification } from '@/types/core';
import {
  dismiss, listNotifications, markAllRead, markRead, subscribeToNotifications,
} from '@/services/notificationsService';

type State = {
  items: Notification[];
  loading: boolean;
  load: () => Promise<void>;
  watch: (userId: string) => () => void;
  markRead: (id: string) => Promise<void>;
  markAllRead: (userId: string) => Promise<void>;
  dismiss: (id: string) => Promise<void>;
  prepend: (n: Notification) => void;
  unreadCount: () => number;
};

export const useNotificationsStore = create<State>((set, get) => ({
  items: [],
  loading: false,

  load: async () => {
    set({ loading: true });
    try { set({ items: await listNotifications(), loading: false }); }
    catch { set({ loading: false }); }
  },

  watch: (userId) =>
    subscribeToNotifications(userId, (n) => get().prepend(n)),

  markRead: async (id) => {
    await markRead(id);
    set({
      items: get().items.map((n) =>
        n.id === id ? { ...n, read_at: new Date().toISOString() } : n,
      ),
    });
  },

  markAllRead: async (userId) => {
    await markAllRead(userId);
    const now = new Date().toISOString();
    set({ items: get().items.map((n) => ({ ...n, read_at: n.read_at ?? now })) });
  },

  dismiss: async (id) => {
    await dismiss(id);
    set({ items: get().items.filter((n) => n.id !== id) });
  },

  prepend: (n) => {
    if (get().items.find((x) => x.id === n.id)) return;
    set({ items: [n, ...get().items].slice(0, 100) });
  },

  unreadCount: () => get().items.filter((n) => n.read_at == null).length,
}));
