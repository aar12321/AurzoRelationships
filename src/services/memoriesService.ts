import { supabase } from './supabase';
import type { Memory, MemoryInput } from '@/types/memories';

export async function listMemories(personId?: string): Promise<Memory[]> {
  if (personId) {
    const { data, error } = await supabase
      .from('memory_people')
      .select('memory_id')
      .eq('person_id', personId);
    if (error) throw error;
    const ids = (data ?? []).map((r: { memory_id: string }) => r.memory_id);
    if (ids.length === 0) return [];
    const { data: mems, error: mErr } = await supabase
      .from('memories')
      .select('*')
      .in('id', ids)
      .order('occurred_on', { ascending: false, nullsFirst: false });
    if (mErr) throw mErr;
    return (mems ?? []) as Memory[];
  }
  const { data, error } = await supabase
    .from('memories')
    .select('*')
    .order('occurred_on', { ascending: false, nullsFirst: false });
  if (error) throw error;
  return (data ?? []) as Memory[];
}

export async function createMemory(
  input: MemoryInput,
  ownerId: string,
): Promise<Memory> {
  const { person_ids, ...rest } = input;
  const payload = {
    ...rest,
    owner_id: ownerId,
    photo_urls: rest.photo_urls ?? [],
  };
  const { data, error } = await supabase
    .from('memories')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  const memory = data as Memory;
  if (person_ids && person_ids.length > 0) {
    await linkPeople(memory.id, person_ids, ownerId);
  }
  return memory;
}

export async function linkPeople(
  memoryId: string,
  personIds: string[],
  ownerId: string,
): Promise<void> {
  await supabase.from('memory_people').delete().eq('memory_id', memoryId);
  if (personIds.length === 0) return;
  const rows = personIds.map((pid) => ({
    memory_id: memoryId,
    person_id: pid,
    owner_id: ownerId,
  }));
  const { error } = await supabase.from('memory_people').insert(rows);
  if (error) throw error;
}

export async function deleteMemory(id: string): Promise<void> {
  const { error } = await supabase.from('memories').delete().eq('id', id);
  if (error) throw error;
}

export function onThisDay(memories: Memory[], when = new Date()): Memory[] {
  const m = when.getMonth();
  const d = when.getDate();
  return memories.filter((mem) => {
    if (!mem.occurred_on) return false;
    const od = new Date(mem.occurred_on + 'T00:00:00');
    return od.getMonth() === m && od.getDate() === d && od.getFullYear() !== when.getFullYear();
  });
}
