import { create } from 'zustand';

type State = {
  open: boolean;
  preselectPersonId: string | null;
  openCapture: (preselectPersonId?: string | null) => void;
  closeCapture: () => void;
};

export const useCaptureMomentStore = create<State>((set) => ({
  open: false,
  preselectPersonId: null,
  openCapture: (preselectPersonId = null) => set({ open: true, preselectPersonId }),
  closeCapture: () => set({ open: false, preselectPersonId: null }),
}));
