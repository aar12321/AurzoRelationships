import { create } from 'zustand';
import type { Person, PersonGroup, PersonInput } from '@/types/people';
import {
  createGroup,
  createPerson,
  deletePerson,
  listGroupMemberships,
  listGroups,
  listPeople,
  setGroupMembership,
  updatePerson,
} from '@/services/peopleService';

type State = {
  people: Person[];
  groups: PersonGroup[];
  memberships: Map<string, Set<string>>;
  loading: boolean;
  error: string | null;
  activePersonId: string | null;

  loadAll: () => Promise<void>;
  add: (input: PersonInput, ownerId: string) => Promise<Person>;
  update: (id: string, patch: Partial<PersonInput>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  addGroup: (name: string, ownerId: string, color?: string) => Promise<PersonGroup>;
  setMemberships: (personId: string, groupIds: string[], ownerId: string) => Promise<void>;
  setActive: (id: string | null) => void;
};

export const usePeopleStore = create<State>((set, get) => ({
  people: [],
  groups: [],
  memberships: new Map(),
  loading: false,
  error: null,
  activePersonId: null,

  loadAll: async () => {
    set({ loading: true, error: null });
    try {
      const [people, groups, links] = await Promise.all([
        listPeople(),
        listGroups(),
        listGroupMemberships(),
      ]);
      const map = new Map<string, Set<string>>();
      for (const { person_id, group_id } of links) {
        const set_ = map.get(person_id) ?? new Set<string>();
        set_.add(group_id);
        map.set(person_id, set_);
      }
      set({ people, groups, memberships: map, loading: false });
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : 'Load failed' });
    }
  },

  add: async (input, ownerId) => {
    const person = await createPerson(input, ownerId);
    set({ people: [...get().people, person].sort(byName) });
    return person;
  },

  update: async (id, patch) => {
    const updated = await updatePerson(id, patch);
    set({
      people: get().people.map((p) => (p.id === id ? updated : p)).sort(byName),
    });
  },

  remove: async (id) => {
    await deletePerson(id);
    set({ people: get().people.filter((p) => p.id !== id) });
  },

  addGroup: async (name, ownerId, color) => {
    const g = await createGroup(name, ownerId, color);
    set({ groups: [...get().groups, g] });
    return g;
  },

  setMemberships: async (personId, groupIds, ownerId) => {
    await setGroupMembership(personId, groupIds, ownerId);
    const next = new Map(get().memberships);
    next.set(personId, new Set(groupIds));
    set({ memberships: next });
  },

  setActive: (id) => set({ activePersonId: id }),
}));

function byName(a: Person, b: Person): number {
  return a.full_name.localeCompare(b.full_name);
}
