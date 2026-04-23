import { create } from 'zustand';
import type { Interaction, InteractionInput } from '@/types/interactions';
import {
  deleteInteraction, listInteractions, logInteraction,
} from '@/services/interactionsService';

type State = {
  interactions: Interaction[];
  loading: boolean;
  error: string | null;
  load: () => Promise<void>;
  log: (input: InteractionInput, ownerId: string) => Promise<Interaction>;
  remove: (id: string) => Promise<void>;
  forPerson: (personId: string) => Interaction[];
};

export const useInteractionsStore = create<State>((set, get) => ({
  interactions: [],
  loading: false,
  error: null,
  load: async () => {
    set({ loading: true, error: null });
    try {
      set({ interactions: await listInteractions(), loading: false });
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : 'Load failed' });
    }
  },
  log: async (input, ownerId) => {
    const row = await logInteraction(input, ownerId);
    set({ interactions: [row, ...get().interactions] });
    return row;
  },
  remove: async (id) => {
    await deleteInteraction(id);
    set({ interactions: get().interactions.filter((i) => i.id !== id) });
  },
  forPerson: (personId) =>
    get().interactions.filter((i) => i.person_id === personId),
}));
