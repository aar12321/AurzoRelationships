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
import { createDate, syncPersonBirthday } from '@/services/datesService';
import { useDatesStore } from '@/stores/datesStore';
import { useAuthStore } from '@/stores/authStore';

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

    // If the add form included a birthday, auto-create the important_date so
    // reminders, the dates calendar, and the forecast surface it immediately.
    // Without this, person.birthday was a dead string on the row — visible
    // on the profile but silently absent from every reminder path.
    if (input.birthday) {
      try {
        const firstName = person.full_name.split(/\s+/)[0] ?? person.full_name;
        const d = await createDate({
          person_id: person.id,
          label: `${firstName}'s birthday`,
          date_type: 'birthday',
          event_date: input.birthday,
          recurring: true,
          lead_times: [14, 7, 3, 0],
        }, ownerId);
        // Keep the datesStore cache consistent without a refetch.
        useDatesStore.setState((s) => ({ dates: [...s.dates, d] }));
      } catch (err) {
        // Non-fatal: the person is saved; the birthday row just didn't join.
        // eslint-disable-next-line no-console
        console.warn('[peopleStore] auto birthday date creation failed:', err);
      }
    }

    return person;
  },

  update: async (id, patch) => {
    // Capture the prior birthday before the row changes so we can diff it.
    const prev = get().people.find((p) => p.id === id) ?? null;
    const updated = await updatePerson(id, patch);
    set({
      people: get().people.map((p) => (p.id === id ? updated : p)).sort(byName),
    });

    // Keep the birthday important_date in sync when the patch touched it.
    // Without this, editing someone's birthday would leave the reminder
    // pointing at the old date — the classic "silent data drift" a
    // high-end app can't afford.
    const ownerId = useAuthStore.getState().user?.id;
    if (ownerId && prev && 'birthday' in patch) {
      const nextBirthday = patch.birthday ?? null;
      if (prev.birthday !== nextBirthday) {
        try {
          const firstName = updated.full_name.split(/\s+/)[0] ?? updated.full_name;
          const result = await syncPersonBirthday({
            personId: id,
            prevBirthday: prev.birthday ?? null,
            nextBirthday,
            firstName,
            ownerId,
          });
          // Reconcile the datesStore cache with the write that happened.
          useDatesStore.setState((s) => {
            if (result.kind === 'inserted') return { dates: [...s.dates, result.date] };
            if (result.kind === 'updated')  return { dates: s.dates.map((d) => d.id === result.date.id ? result.date : d) };
            if (result.kind === 'deleted')  return { dates: s.dates.filter((d) => d.id !== result.id) };
            return s;
          });
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn('[peopleStore] birthday sync on update failed:', err);
        }
      }
    }
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
