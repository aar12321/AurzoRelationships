import { supabase } from './supabase';
import type {
  Person,
  PersonGroup,
  PersonInput,
  Strength,
} from '@/types/people';

const TABLE = 'people';
const GROUPS = 'person_groups';
const MEMBERS = 'person_group_members';

export async function listPeople(): Promise<Person[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('full_name', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Person[];
}

export async function getPerson(id: string): Promise<Person | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as Person | null) ?? null;
}

export async function createPerson(
  input: PersonInput,
  ownerId: string,
): Promise<Person> {
  const payload = {
    ...input,
    owner_id: ownerId,
    life_context: input.life_context ?? {},
    custom_fields: input.custom_fields ?? [],
  };
  const { data, error } = await supabase
    .from(TABLE)
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data as Person;
}

export async function updatePerson(
  id: string,
  patch: Partial<PersonInput>,
): Promise<Person> {
  const { data, error } = await supabase
    .from(TABLE)
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Person;
}

export async function deletePerson(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) throw error;
}

export async function listGroups(): Promise<PersonGroup[]> {
  const { data, error } = await supabase
    .from(GROUPS)
    .select('*')
    .order('name', { ascending: true });
  if (error) throw error;
  return (data ?? []) as PersonGroup[];
}

export async function createGroup(
  name: string,
  ownerId: string,
  color?: string,
): Promise<PersonGroup> {
  const { data, error } = await supabase
    .from(GROUPS)
    .insert({ name, color: color ?? null, owner_id: ownerId })
    .select()
    .single();
  if (error) throw error;
  return data as PersonGroup;
}

export async function listGroupMemberships(): Promise<
  { group_id: string; person_id: string }[]
> {
  const { data, error } = await supabase
    .from(MEMBERS)
    .select('group_id, person_id');
  if (error) throw error;
  return data ?? [];
}

export async function setGroupMembership(
  personId: string,
  groupIds: string[],
  ownerId: string,
): Promise<void> {
  const { error: delErr } = await supabase
    .from(MEMBERS)
    .delete()
    .eq('person_id', personId);
  if (delErr) throw delErr;
  if (groupIds.length === 0) return;
  const rows = groupIds.map((group_id) => ({
    group_id,
    person_id: personId,
    owner_id: ownerId,
  }));
  const { error: insErr } = await supabase.from(MEMBERS).insert(rows);
  if (insErr) throw insErr;
}

// Strength is a feeling, not a number — derived from recency only here.
// Module 4 (Health) will refine using interaction frequency + quality.
export function deriveStrength(
  lastContactedAt: string | null,
  fadingThresholdDays: number | null,
): Strength {
  if (!lastContactedAt) return 'unknown';
  const days =
    (Date.now() - new Date(lastContactedAt).getTime()) / (1000 * 60 * 60 * 24);
  const fadeAt = fadingThresholdDays ?? 30;
  const dormantAt = fadeAt * 3;
  if (days <= fadeAt / 2) return 'thriving';
  if (days <= fadeAt) return 'active';
  if (days <= dormantAt) return 'fading';
  return 'dormant';
}
