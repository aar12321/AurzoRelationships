import { create } from 'zustand';
import type { ImportantDate, ImportantDateInput } from '@/types/dates';
import {
  createDate, deleteDate, isPrimaryBirthdayRow, listDates, updateDate,
} from '@/services/datesService';
import { usePeopleStore } from './peopleStore';

type State = {
  dates: ImportantDate[];
  loading: boolean;
  error: string | null;
  load: () => Promise<void>;
  add: (input: ImportantDateInput, ownerId: string) => Promise<ImportantDate>;
  update: (id: string, patch: Partial<ImportantDateInput>) => Promise<void>;
  remove: (id: string) => Promise<void>;
};

// Mirror person.birthday in the local people cache so the profile page
// doesn't show a stale value after the dates list edits a primary birthday
// row. The DB write already happened in datesService — this only keeps the
// in-memory cache consistent.
function reconcilePersonBirthday(personId: string, birthday: string | null) {
  usePeopleStore.setState((s) => ({
    people: s.people.map((p) => (p.id === personId ? { ...p, birthday } : p)),
  }));
}

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
    if (d.date_type === 'birthday' && d.person_id && await isPrimaryBirthdayRow(d)) {
      reconcilePersonBirthday(d.person_id, d.event_date);
    }
  },
  remove: async (id) => {
    const before = get().dates.find((d) => d.id === id) ?? null;
    const wasPrimary = before
      ? await isPrimaryBirthdayRow(before)
      : false;
    await deleteDate(id);
    set({ dates: get().dates.filter((d) => d.id !== id) });
    if (wasPrimary && before?.person_id) {
      reconcilePersonBirthday(before.person_id, null);
    }
  },
}));
