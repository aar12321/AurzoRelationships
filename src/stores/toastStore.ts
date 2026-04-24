// Global toast queue. Any code can call `toast.success('Saved')` — no hooks
// required at the callsite. The store is intentionally thin: Zustand already
// gives us subscribability from a React component (the Toaster below reads
// `toasts` and re-renders); the imperative API is what makes this pleasant
// to sprinkle into try/catch blocks.

import { create } from 'zustand';

export type ToastKind = 'success' | 'error' | 'info';

export type Toast = {
  id: string;
  kind: ToastKind;
  message: string;
  action?: { label: string; onClick: () => void };
};

type State = {
  toasts: Toast[];
  push: (t: Omit<Toast, 'id'>, ttlMs?: number) => string;
  dismiss: (id: string) => void;
};

export const useToastStore = create<State>((set, get) => ({
  toasts: [],
  push: (t, ttlMs = 4500) => {
    const id = (crypto.randomUUID?.() ?? String(Date.now() + Math.random()));
    set({ toasts: [...get().toasts, { id, ...t }] });
    if (ttlMs > 0) {
      setTimeout(() => get().dismiss(id), ttlMs);
    }
    return id;
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));

// Ergonomic imperative API. Keeps callsites one-liners and the kind is
// in the verb, not a magic string.
export const toast = {
  success: (message: string, opts?: { action?: Toast['action']; ttlMs?: number }) =>
    useToastStore.getState().push({ kind: 'success', message, action: opts?.action }, opts?.ttlMs),
  error: (message: string, opts?: { action?: Toast['action']; ttlMs?: number }) =>
    useToastStore.getState().push({ kind: 'error', message, action: opts?.action }, opts?.ttlMs ?? 6500),
  info: (message: string, opts?: { action?: Toast['action']; ttlMs?: number }) =>
    useToastStore.getState().push({ kind: 'info', message, action: opts?.action }, opts?.ttlMs),
};
