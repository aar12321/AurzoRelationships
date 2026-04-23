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
