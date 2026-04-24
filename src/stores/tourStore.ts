// Feature tour state — small Zustand store so any component can trigger or
// dismiss the tour. The "seen" flag lives in Supabase (app_access.preferences),
// loaded once per session by Dashboard/AppShell.

import { create } from 'zustand';
import { TOUR_STEPS } from '@/services/tourService';

type TourState = {
  open: boolean;
  index: number;
  totalSteps: number;
  start: () => void;
  next: () => void;
  prev: () => void;
  goto: (index: number) => void;
  exit: () => void;
};

export const useTourStore = create<TourState>((set, get) => ({
  open: false,
  index: 0,
  totalSteps: TOUR_STEPS.length,
  start: () => set({ open: true, index: 0 }),
  next: () => {
    const { index, totalSteps } = get();
    if (index >= totalSteps - 1) set({ open: false });
    else set({ index: index + 1 });
  },
  prev: () => {
    const { index } = get();
    if (index > 0) set({ index: index - 1 });
  },
  goto: (index) => set({ index: Math.max(0, Math.min(TOUR_STEPS.length - 1, index)) }),
  exit: () => set({ open: false }),
}));
