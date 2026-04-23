import { create } from 'zustand';
import type { ImportantDate, ImportantDateInput } from '@/types/dates';
import {
  createDate, deleteDate, listDates, updateDate,
} from '@/services/datesService';

type State = {
  dates: ImportantDate[];
  loading: boolean;
  error: string | null;
  load: () => Promise<void>;
  add: (input: ImportantDateInput, ownerId: string) => Promise<ImportantDate>;
  update: (id: string, patch: Partial<ImportantDateInput>) => Promise<void>;
  remove: (id: string) => Promise<void>;
};

export const useDatesStore = create<State>((set, get) => ({
  dates: [],
  loading: false,
  error: null,
  load: async () => {
    set({ loading: true, error: null });
    try {
      set({ dates: await listDates(), loading: false });
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : 'Load failed' });
    }
  },
  add: async (input, ownerId) => {
    const d = await createDate(input, ownerId);
    set({ dates: [...get().dates, d] });
    return d;
  },
  update: async (id, patch) => {
    const d = await updateDate(id, patch);
    set({ dates: get().dates.map((x) => (x.id === id ? d : x)) });
  },
  remove: async (id) => {
    await deleteDate(id);
    set({ dates: get().dates.filter((d) => d.id !== id) });
  },
}));
