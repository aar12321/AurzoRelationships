import { supabase } from './supabase';
import type { ImportantDate, ImportantDateInput } from '@/types/dates';
import { daysUntil } from '@/types/dates';

const TABLE = 'important_dates';

export async function listDates(): Promise<ImportantDate[]> {
  const { data, error } = await supabase.from(TABLE).select('*');
  if (error) throw error;
  return (data ?? []) as ImportantDate[];
}

export async function createDate(
  input: ImportantDateInput,
  ownerId: string,
): Promise<ImportantDate> {
  const payload = {
    ...input,
    owner_id: ownerId,
    recurring: input.recurring ?? true,
    lead_times: input.lead_times ?? [14, 7, 3, 0],
  };
  const { data, error } = await supabase
    .from(TABLE)
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data as ImportantDate;
}

export async function updateDate(
  id: string,
  patch: Partial<ImportantDateInput>,
): Promise<ImportantDate> {
  const { data, error } = await supabase
    .from(TABLE)
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as ImportantDate;
}

export async function deleteDate(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) throw error;
}

export function sortByUpcoming(
  dates: ImportantDate[],
  from: Date = new Date(),
): ImportantDate[] {
  return [...dates].sort((a, b) => daysUntil(a, from) - daysUntil(b, from));
}

export function upcomingWithin(
  dates: ImportantDate[],
  days: number,
  from: Date = new Date(),
): ImportantDate[] {
  return sortByUpcoming(dates, from).filter((d) => {
    const n = daysUntil(d, from);
    return n >= 0 && n <= days;
  });
}

export function recentlyPassed(
  dates: ImportantDate[],
  days = 3,
  from: Date = new Date(),
): ImportantDate[] {
  return dates.filter((d) => {
    const n = daysUntil(d, from);
    return n < 0 && n >= -days;
  });
}

// Reconciles the birthday important_date row for a person after the
// person's own birthday field has been written. Four cases:
//
//   prev   | next   | action
//   null   | null   | noop
//   null   | set    | insert new important_date (matches add() shape)
//   set    | null   | delete the auto-created birthday row
//   set    | diff   | update event_date on the existing row
//
// Returns the shape of the mutation so callers can reconcile their local
// caches (the datesStore mostly) without a refetch. Lookup uses
// (person_id, date_type='birthday') ordered by created_at ascending so we
// always touch the original auto-created row, leaving any user-added
// siblings alone.
export type BirthdaySync =
  | { kind: 'noop' }
  | { kind: 'inserted'; date: ImportantDate }
  | { kind: 'updated'; date: ImportantDate }
  | { kind: 'deleted'; id: string };

export async function syncPersonBirthday(args: {
  personId: string;
  prevBirthday: string | null;
  nextBirthday: string | null;
  firstName: string;
  ownerId: string;
}): Promise<BirthdaySync> {
  const { personId, prevBirthday, nextBirthday, firstName, ownerId } = args;
  if (prevBirthday === nextBirthday) return { kind: 'noop' };

  // Locate the existing primary birthday row for this person, if any.
  const { data: existing } = await supabase
    .from(TABLE)
    .select('*')
    .eq('person_id', personId)
    .eq('date_type', 'birthday')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  // null → set: insert
  if (!prevBirthday && nextBirthday && !existing) {
    const date = await createDate({
      person_id: personId,
      label: `${firstName}'s birthday`,
      date_type: 'birthday',
      event_date: nextBirthday,
      recurring: true,
      lead_times: [14, 7, 3, 0],
    }, ownerId);
    return { kind: 'inserted', date };
  }

  // set → null: delete the matched row
  if (prevBirthday && !nextBirthday && existing) {
    await deleteDate(existing.id);
    return { kind: 'deleted', id: existing.id };
  }

  // set → different: update event_date
  if (nextBirthday && existing && existing.event_date !== nextBirthday) {
    const date = await updateDate(existing.id, { event_date: nextBirthday });
    return { kind: 'updated', date };
  }

  // Edge case: db state drifted (e.g. user manually deleted the date but
  // person.birthday is still set). If we have a next value with no row,
  // insert; otherwise fall through to noop.
  if (nextBirthday && !existing) {
    const date = await createDate({
      person_id: personId,
      label: `${firstName}'s birthday`,
      date_type: 'birthday',
      event_date: nextBirthday,
      recurring: true,
      lead_times: [14, 7, 3, 0],
    }, ownerId);
    return { kind: 'inserted', date };
  }
  return { kind: 'noop' };
}
