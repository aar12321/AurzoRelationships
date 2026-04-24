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

// Edits to the *primary* birthday row (oldest by created_at, the one we
// auto-create from person.birthday) flow back to people.birthday so the
// profile and the dates list never drift. Callers inside this module
// (syncPersonBirthday) pass skipPersonSync to break the cycle since they
// already wrote to people themselves.
type DateMutateOpts = { skipPersonSync?: boolean };

export async function updateDate(
  id: string,
  patch: Partial<ImportantDateInput>,
  opts: DateMutateOpts = {},
): Promise<ImportantDate> {
  const { data, error } = await supabase
    .from(TABLE)
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  const d = data as ImportantDate;
  if (!opts.skipPersonSync && await isPrimaryBirthdayRow(d)) {
    await writePersonBirthday(d.person_id!, d.event_date);
  }
  return d;
}

export async function deleteDate(
  id: string,
  opts: DateMutateOpts = {},
): Promise<void> {
  let syncTarget: string | null = null;
  if (!opts.skipPersonSync) {
    const { data: existing } = await supabase
      .from(TABLE)
      .select('id, person_id, date_type, created_at')
      .eq('id', id)
      .maybeSingle();
    if (existing && await isPrimaryBirthdayRow(existing as ImportantDate)) {
      syncTarget = (existing as ImportantDate).person_id;
    }
  }
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) throw error;
  if (syncTarget) await writePersonBirthday(syncTarget, null);
}

// True when the row is the auto-created/primary birthday row for a person —
// i.e. has type=birthday, a person_id, and is the oldest row matching that
// (person_id, date_type). Lets a user keep secondary birthday rows (e.g.
// "throw-Sarah-a-belated party" reminder) without back-syncing them.
export async function isPrimaryBirthdayRow(
  row: Pick<ImportantDate, 'id' | 'person_id' | 'date_type'>,
): Promise<boolean> {
  if (row.date_type !== 'birthday' || !row.person_id) return false;
  const { data } = await supabase
    .from(TABLE)
    .select('id')
    .eq('person_id', row.person_id)
    .eq('date_type', 'birthday')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  return data?.id === row.id;
}

async function writePersonBirthday(personId: string, birthday: string | null): Promise<void> {
  const { error } = await supabase.from('people').update({ birthday }).eq('id', personId);
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
    await deleteDate(existing.id, { skipPersonSync: true });
    return { kind: 'deleted', id: existing.id };
  }

  // set → different: update event_date
  if (nextBirthday && existing && existing.event_date !== nextBirthday) {
    const date = await updateDate(existing.id, { event_date: nextBirthday }, { skipPersonSync: true });
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
