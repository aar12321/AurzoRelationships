import { create } from 'zustand';
import type {
  GiftGiven, GiftGivenInput, GiftIdea, GiftIdeaInput,
} from '@/types/gifts';
import {
  createIdea, deleteIdea, listGiven, listIdeas, logGiven, updateIdea,
} from '@/services/giftsService';

type State = {
  ideas: GiftIdea[];
  given: GiftGiven[];
  loading: boolean;
  load: () => Promise<void>;
  addIdea: (input: GiftIdeaInput, ownerId: string) => Promise<GiftIdea>;
  editIdea: (id: string, patch: Partial<GiftIdeaInput>) => Promise<void>;
  removeIdea: (id: string) => Promise<void>;
  markGiven: (input: GiftGivenInput, ownerId: string) => Promise<GiftGiven>;
  ideasFor: (personId: string) => GiftIdea[];
  givenFor: (personId: string) => GiftGiven[];
};

export const useGiftsStore = create<State>((set, get) => ({
  ideas: [],
  given: [],
  loading: false,
  load: async () => {
    set({ loading: true });
    const [ideas, given] = await Promise.all([listIdeas(), listGiven()]);
    set({ ideas, given, loading: false });
  },
  addIdea: async (input, ownerId) => {
    const i = await createIdea(input, ownerId);
    set({ ideas: [i, ...get().ideas] });
    return i;
  },
  editIdea: async (id, patch) => {
    const i = await updateIdea(id, patch);
    set({ ideas: get().ideas.map((x) => (x.id === id ? i : x)) });
  },
  removeIdea: async (id) => {
    await deleteIdea(id);
    set({ ideas: get().ideas.filter((x) => x.id !== id) });
  },
  markGiven: async (input, ownerId) => {
    const row = await logGiven(input, ownerId);
    set({ given: [row, ...get().given] });
    return row;
  },
  ideasFor: (personId) => get().ideas.filter((i) => i.person_id === personId),
  givenFor: (personId) => get().given.filter((g) => g.person_id === personId),
}));
