import { create } from 'zustand';
import type { Memory, MemoryInput } from '@/types/memories';
import {
  createMemory, deleteMemory, listMemories,
} from '@/services/memoriesService';

type State = {
  memories: Memory[];
  loading: boolean;
  load: () => Promise<void>;
  add: (input: MemoryInput, ownerId: string) => Promise<Memory>;
  remove: (id: string) => Promise<void>;
};

export const useMemoriesStore = create<State>((set, get) => ({
  memories: [],
  loading: false,
  load: async () => {
    set({ loading: true });
    set({ memories: await listMemories(), loading: false });
  },
  add: async (input, ownerId) => {
    const m = await createMemory(input, ownerId);
    set({ memories: [m, ...get().memories] });
    return m;
  },
  remove: async (id) => {
    await deleteMemory(id);
    set({ memories: get().memories.filter((m) => m.id !== id) });
  },
}));
