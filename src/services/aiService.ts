import { supabase } from './supabase';
import { cachedAi, cachedAiShared, TTL } from './aiCache';
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

// Two-tier gift_ideas. When we can extract at least one interest tag from
// the person's notes / life_context, we route through the cross-user
// shared cache with a sanitized fingerprint (relationship_type + tags +
// budget bucket + occasion — no names, no notes). The server uses a
// name-free prompt in that case, so the cached result is reusable for
// any other user with the same shape. Otherwise we fall back to the
// per-user cache and the original personalized prompt.
export async function aiGiftIdeas(
  person: Person,
  budget?: number,
  occasion?: string,
): Promise<GiftIdea[]> {
  const tags = extractInterestTags(person);
  if (tags.length >= 1) {
    const fingerprint = {
      relationship_type: person.relationship_type ?? 'friend',
      budget_bucket: budgetBucket(budget),
      occasion: (occasion ?? 'general').toLowerCase().trim(),
      interest_tags: tags,
    };
    return cachedAiShared(
      { action: 'gift_ideas', params: fingerprint },
      async (cacheSharedKey) => {
        const r = await invoke<{ ideas: GiftIdea[] }>({
          action: 'gift_ideas',
          // Sanitized payload — server must NOT see notes/full_name when
          // shared cache is active, since the result lands in a row that
          // any other user can read.
          person: { relationship_type: person.relationship_type ?? null },
          interest_tags: tags,
          budget, occasion,
          cache_shared_key: cacheSharedKey,
          cache_shared_action: 'gift_ideas',
          cache_shared_ttl_ms: TTL.day7,
        });
        return r.ideas ?? [];
      },
    );
  }

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

// Crude interest-tag extractor. Pulls 4+ letter tokens from the person's
// free-text fields, drops a small stopword list, dedupes, sorts so the
// fingerprint is order-independent, caps at 5 so the cache key stays
// bounded. Imperfect — two users describing the same friend may pick
// different words — but good enough as a v1 cross-user dedup signal.
function extractInterestTags(p: Person): string[] {
  const text = [
    p.notes ?? '',
    p.life_context?.job ?? '',
    p.life_context?.major_events ?? '',
  ].join(' ').toLowerCase();
  const STOPWORDS = new Set([
    'the','and','for','with','that','this','they','have','from','your',
    'their','them','then','than','some','more','most','very','just','about',
    'into','also','been','being','were','will','would','could','should','what',
    'when','where','which','because','since','years','year','really','always',
    'never','still','want','wants','wanted','really','kind','like','likes','loves',
  ]);
  const words = text.split(/[^a-z]+/).filter((w) => w.length >= 4 && !STOPWORDS.has(w));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const w of words) {
    if (!seen.has(w)) { seen.add(w); out.push(w); }
    if (out.length >= 5) break;
  }
  return out.sort();
}

function budgetBucket(b?: number): 'low' | 'medium' | 'high' | 'any' {
  if (b == null) return 'any';
  if (b < 30) return 'low';
  if (b < 100) return 'medium';
  return 'high';
}

// Date ideas have a clean public-shape input — sorted shared interest
// tags + budget bucket + optional location. None of that is PII, so we
// route through the cross-user shared cache: a fresh response paid for
// by anyone satisfies everyone with the same shape.
export async function aiDateIdeas(
  sharedInterests: string[],
  budget?: 'low' | 'medium' | 'high',
  location?: string,
): Promise<DateIdea[]> {
  const fingerprint = {
    interests: [...sharedInterests].map((s) => s.trim().toLowerCase()).sort(),
    budget: budget ?? null,
    location: location?.trim().toLowerCase() ?? null,
  };
  return cachedAiShared(
    { action: 'date_ideas', params: fingerprint },
    async (cacheSharedKey) => {
      const r = await invoke<{ ideas: DateIdea[] }>({
        action: 'date_ideas',
        shared_interests: sharedInterests, budget, location,
        cache_shared_key: cacheSharedKey,
        cache_shared_action: 'date_ideas',
        cache_shared_ttl_ms: TTL.day7,
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
