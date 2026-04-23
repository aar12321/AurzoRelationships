import { create } from 'zustand';
import type { AurzoEvent, EventInput } from '@/types/events';
import {
  createEvent, deleteEvent, listEvents, updateEvent,
} from '@/services/eventsService';

type State = {
  events: AurzoEvent[];
  loading: boolean;
  load: () => Promise<void>;
  add: (input: EventInput, ownerId: string) => Promise<AurzoEvent>;
  update: (id: string, patch: Partial<EventInput>) => Promise<void>;
  remove: (id: string) => Promise<void>;
};

export const useEventsStore = create<State>((set, get) => ({
  events: [],
  loading: false,
  load: async () => {
    set({ loading: true });
    set({ events: await listEvents(), loading: false });
  },
  add: async (input, ownerId) => {
    const e = await createEvent(input, ownerId);
    set({ events: [...get().events, e] });
    return e;
  },
  update: async (id, patch) => {
    const e = await updateEvent(id, patch);
    set({ events: get().events.map((x) => (x.id === id ? e : x)) });
  },
  remove: async (id) => {
    await deleteEvent(id);
    set({ events: get().events.filter((e) => e.id !== id) });
  },
}));
