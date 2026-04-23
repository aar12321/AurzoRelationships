import { create } from 'zustand';

type State = {
  open: boolean;
  openPalette: () => void;
  closePalette: () => void;
  togglePalette: () => void;
};

export const useCommandPaletteStore = create<State>((set) => ({
  open: false,
  openPalette:   () => set({ open: true }),
  closePalette:  () => set({ open: false }),
  togglePalette: () => set((s) => ({ open: !s.open })),
}));
