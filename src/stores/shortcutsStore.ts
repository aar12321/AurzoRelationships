// Tiny store for the "? shortcuts help" overlay. Separate from the command
// palette store so they can coexist without accidentally stealing focus from
// each other.

import { create } from 'zustand';

type State = {
  open: boolean;
  toggle: () => void;
  close: () => void;
};

export const useShortcutsStore = create<State>((set, get) => ({
  open: false,
  toggle: () => set({ open: !get().open }),
  close: () => set({ open: false }),
}));
