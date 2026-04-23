import { supabase } from './supabase';
import type {
  AurzoEvent, EventGuest, EventInput, EventTask, RSVP,
} from '@/types/events';

export async function listEvents(): Promise<AurzoEvent[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('starts_at', { ascending: true, nullsFirst: false });
  if (error) throw error;
  return (data ?? []) as AurzoEvent[];
}

export async function getEvent(id: string): Promise<AurzoEvent | null> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as AurzoEvent | null) ?? null;
}

export async function createEvent(
  input: EventInput,
  ownerId: string,
): Promise<AurzoEvent> {
  const { data, error } = await supabase
    .from('events')
    .insert({ ...input, owner_id: ownerId })
    .select()
    .single();
  if (error) throw error;
  return data as AurzoEvent;
}

export async function updateEvent(
  id: string,
  patch: Partial<EventInput>,
): Promise<AurzoEvent> {
  const { data, error } = await supabase
    .from('events')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as AurzoEvent;
}

export async function deleteEvent(id: string): Promise<void> {
  const { error } = await supabase.from('events').delete().eq('id', id);
  if (error) throw error;
}

export async function listGuests(eventId: string): Promise<EventGuest[]> {
  const { data, error } = await supabase
    .from('event_guests')
    .select('*')
    .eq('event_id', eventId);
  if (error) throw error;
  return (data ?? []) as EventGuest[];
}

export async function addGuest(
  eventId: string,
  personId: string,
  ownerId: string,
): Promise<void> {
  const { error } = await supabase
    .from('event_guests')
    .insert({ event_id: eventId, person_id: personId, owner_id: ownerId });
  if (error) throw error;
}

export async function updateRsvp(
  eventId: string,
  personId: string,
  rsvp: RSVP,
): Promise<void> {
  const { error } = await supabase
    .from('event_guests')
    .update({ rsvp })
    .eq('event_id', eventId)
    .eq('person_id', personId);
  if (error) throw error;
}

export async function removeGuest(eventId: string, personId: string): Promise<void> {
  const { error } = await supabase
    .from('event_guests')
    .delete()
    .eq('event_id', eventId)
    .eq('person_id', personId);
  if (error) throw error;
}

export async function listTasks(eventId: string): Promise<EventTask[]> {
  const { data, error } = await supabase
    .from('event_tasks')
    .select('*')
    .eq('event_id', eventId)
    .order('sort_order');
  if (error) throw error;
  return (data ?? []) as EventTask[];
}

export async function addTask(
  eventId: string,
  title: string,
  ownerId: string,
  sortOrder = 0,
): Promise<EventTask> {
  const { data, error } = await supabase
    .from('event_tasks')
    .insert({ event_id: eventId, owner_id: ownerId, title, sort_order: sortOrder })
    .select()
    .single();
  if (error) throw error;
  return data as EventTask;
}

export async function toggleTask(id: string, done: boolean): Promise<void> {
  const { error } = await supabase
    .from('event_tasks')
    .update({ done })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.from('event_tasks').delete().eq('id', id);
  if (error) throw error;
}
