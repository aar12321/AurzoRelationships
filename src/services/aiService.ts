import { supabase } from './supabase';
import type { Person } from '@/types/people';
import type { ImportantDate } from '@/types/dates';
import { daysUntil } from '@/types/dates';

// Client-side SDK wrapper for the aurzo-ai edge function. All Claude calls
// go through the function — the API key never reaches the browser.

type GiftIdea = { title: string; reason: string; estimated_cost?: number };
type DateIdea = { title: string; why: string; cost: string };
type WeeklyPulse = { person_name: string; message: string; suggested_action?: string };

async function invoke<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>('aurzo-ai', { body });
  if (error) throw error;
  if (data == null) throw new Error('empty response');
  return data;
}

function personCtx(p: Person) {
  return {
    full_name: p.full_name,
    relationship_type: p.relationship_type,
    notes: p.notes,
    interests: p.life_context?.job ?? null,
    life_context: p.life_context,
    last_contacted_at: p.last_contacted_at,
  };
}

function dateCtx(d: ImportantDate) {
  return {
    label: d.label,
    event_date: d.event_date,
    days_until: daysUntil(d),
  };
}

export async function aiGiftIdeas(
  person: Person,
  budget?: number,
  occasion?: string,
): Promise<GiftIdea[]> {
  const r = await invoke<{ ideas: GiftIdea[] }>({
    action: 'gift_ideas', person: personCtx(person), budget, occasion,
  });
  return r.ideas ?? [];
}

export async function aiDateIdeas(
  sharedInterests: string[],
  budget?: 'low' | 'medium' | 'high',
  location?: string,
): Promise<DateIdea[]> {
  const r = await invoke<{ ideas: DateIdea[] }>({
    action: 'date_ideas',
    shared_interests: sharedInterests, budget, location,
  });
  return r.ideas ?? [];
}

export async function aiCompose(
  person: Person,
  occasion: string,
  tone: string,
  channel: string,
): Promise<string[]> {
  const r = await invoke<{ variants: string[] }>({
    action: 'compose',
    person: personCtx(person), occasion, tone, channel,
  });
  return r.variants ?? [];
}

export async function aiAdvise(
  question: string,
  people: Person[],
  dates: ImportantDate[],
): Promise<string> {
  const r = await invoke<{ reply: string }>({
    action: 'advise',
    question,
    people: people.map(personCtx),
    dates: dates.map(dateCtx),
  });
  return r.reply;
}

export async function aiWeeklyPulse(
  people: Person[],
  dates: ImportantDate[],
): Promise<WeeklyPulse> {
  return invoke<WeeklyPulse>({
    action: 'weekly_pulse',
    people: people.map(personCtx),
    dates: dates.map(dateCtx),
  });
}
