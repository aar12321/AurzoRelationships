import { supabase } from './supabase';
import { cachedAi, TTL } from './aiCache';
import type { Person } from '@/types/people';
import type { ImportantDate } from '@/types/dates';
import { daysUntil } from '@/types/dates';

const SUPABASE_URL =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ??
  (import.meta.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined) ?? '';
const SUPABASE_KEY =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ??
  (import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY as string | undefined) ?? '';

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

// Cache fingerprint uses person.id (not the full object) so notes / avatar
// edits don't thrash the cache. TTLs chosen to match spec intent: evergreen
// for things that don't change (gift ideas), short for conversational calls.

export async function aiGiftIdeas(
  person: Person,
  budget?: number,
  occasion?: string,
): Promise<GiftIdea[]> {
  return cachedAi(
    {
      action: 'gift_ideas',
      params: { personId: person.id, budget: budget ?? null, occasion: occasion ?? null },
      ttlMs: TTL.day7,
    },
    async () => {
      const r = await invoke<{ ideas: GiftIdea[] }>({
        action: 'gift_ideas', person: personCtx(person), budget, occasion,
      });
      return r.ideas ?? [];
    },
  );
}

export async function aiDateIdeas(
  sharedInterests: string[],
  budget?: 'low' | 'medium' | 'high',
  location?: string,
): Promise<DateIdea[]> {
  return cachedAi(
    {
      action: 'date_ideas',
      params: {
        interests: [...sharedInterests].sort(),
        budget: budget ?? null,
        location: location ?? null,
      },
      ttlMs: TTL.day7,
    },
    async () => {
      const r = await invoke<{ ideas: DateIdea[] }>({
        action: 'date_ideas',
        shared_interests: sharedInterests, budget, location,
      });
      return r.ideas ?? [];
    },
  );
}

export async function aiCompose(
  person: Person,
  occasion: string,
  tone: string,
  channel: string,
): Promise<string[]> {
  return cachedAi(
    {
      action: 'compose',
      params: { personId: person.id, occasion, tone, channel },
      ttlMs: TTL.hour1, // short: users often want different vibes on re-draft
    },
    async () => {
      const r = await invoke<{ variants: string[] }>({
        action: 'compose',
        person: personCtx(person), occasion, tone, channel,
      });
      return r.variants ?? [];
    },
  );
}

export async function aiAdvise(
  question: string,
  people: Person[],
  dates: ImportantDate[],
): Promise<string> {
  return cachedAi(
    {
      action: 'advise',
      params: {
        question: question.trim().toLowerCase(),
        peopleCount: people.length,
        datesCount: dates.length,
      },
      ttlMs: TTL.minute5, // same question twice in quick succession → same answer
    },
    async () => {
      const r = await invoke<{ reply: string }>({
        action: 'advise',
        question,
        people: people.map(personCtx),
        dates: dates.map(dateCtx),
      });
      return r.reply;
    },
  );
}

export async function aiWeeklyPulse(
  people: Person[],
  dates: ImportantDate[],
): Promise<WeeklyPulse> {
  return cachedAi(
    {
      action: 'weekly_pulse',
      params: { week: isoWeek(new Date()), peopleCount: people.length },
      ttlMs: TTL.day7, // pulse is the "person for this week" — safe to reuse
    },
    () => invoke<WeeklyPulse>({
      action: 'weekly_pulse',
      people: people.map(personCtx),
      dates: dates.map(dateCtx),
    }),
  );
}

// ISO week string like "2026-W17" — deterministic per week, so the weekly
// pulse cache key rolls over naturally every Monday.
function isoWeek(d: Date): string {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((t.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

// NOT cached — this endpoint has a side effect (inserts a notification row).
// Re-running must actually produce a new notification, not return the old
// "created: true" response. Streaming advise (aiAdviseStream) is also
// intentionally uncached below for the same class of reason: we can't
// serialize a stream into a single jsonb result.
export async function aiSurfacePulse(
  people: Person[],
  dates: ImportantDate[],
): Promise<{ created: boolean }> {
  return invoke<{ created: boolean }>({
    action: 'surface_pulse',
    people: people.map(personCtx),
    dates: dates.map(dateCtx),
  });
}

// Streaming advise — uses fetch directly so we can consume the response body
// chunk-by-chunk. onChunk fires for every decoded text fragment as it arrives.
export async function aiAdviseStream(
  question: string,
  people: Person[],
  dates: ImportantDate[],
  onChunk: (text: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  const resp = await fetch(`${SUPABASE_URL}/functions/v1/aurzo-ai`, {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${session?.access_token ?? SUPABASE_KEY}`,
    },
    body: JSON.stringify({
      action: 'advise',
      question,
      stream: true,
      people: people.map(personCtx),
      dates: dates.map(dateCtx),
    }),
  });
  if (!resp.ok || !resp.body) {
    throw new Error(`AI stream failed: ${resp.status}`);
  }
  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let full = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    const text = decoder.decode(value, { stream: true });
    if (text) {
      full += text;
      onChunk(text);
    }
  }
  const tail = decoder.decode();
  if (tail) { full += tail; onChunk(tail); }
  return full;
}
