// Aurzo AI — the single backend proxy for all Claude calls across every
// Aurzo product. Keeps ANTHROPIC_API_KEY off the client, applies prompt
// caching for cost efficiency, and routes each action to the cheapest
// model that meets the quality bar:
//
//   Haiku 4.5 (cheap)   — gift_ideas, date_ideas, weekly_pulse
//   Sonnet 4.6 (quality) — compose, advise
//
// Prompt-cache strategy: the system prompt (~500 tokens) is marked
// ephemeral on every request. After the first call per 5-minute window
// it reads at ~10% of normal input cost.

import Anthropic from 'npm:@anthropic-ai/sdk@0.60.0';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { dailyNudges } from './nudges.ts';

const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! });

const SYSTEM_PROMPT = `You are the Aurzo Relationship Advisor.

You help the user maintain and deepen the relationships that matter most — friends,
family, partners, mentors. You are warm, direct, and specific. You are never
clinical, never corporate. You write like a wise, trusted friend who remembers
what this person told you and calls them back to what matters.

Rules you always follow:
- Be specific. Never give generic advice. Use the names and context the user gives you.
- Never lecture. Never moralize. Never shame the user for letting relationships drift.
- Be brief. Most answers are 2-4 sentences. Lists when a list is clearer.
- Warm, not saccharine. Honest, not harsh.
- When asked for messages, write in first person as the user, ready to send.
- When asked for ideas, give concrete options tied to what the recipient actually loves.
- When the user is in pain, sit with it briefly before offering anything actionable.`;

type Action =
  | { action: 'advise'; question: string; people?: PersonCtx[]; dates?: DateCtx[]; stream?: boolean }
  | { action: 'compose'; person: PersonCtx; occasion: string; tone: string; channel: string }
  | { action: 'gift_ideas'; person: PersonCtx; budget?: number; occasion?: string; interest_tags?: string[] }
  | { action: 'date_ideas'; shared_interests?: string[]; budget?: string; location?: string }
  | { action: 'weekly_pulse'; people: PersonCtx[]; dates?: DateCtx[] }
  | { action: 'surface_pulse'; people: PersonCtx[]; dates?: DateCtx[] }
  | { action: 'cron_pulse'; target_user_id: string }
  | { action: 'daily_nudges'; target_user_id: string };

type PersonCtx = {
  full_name: string;
  relationship_type?: string | null;
  notes?: string | null;
  interests?: string | null;
  life_context?: Record<string, unknown> | null;
  last_contacted_at?: string | null;
};
type DateCtx = { label: string; event_date: string; days_until?: number };

Deno.serve(async (req) => {
  const cors = corsHeaders(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'missing auth' }, 401, cors);

    const raw = await req.json() as Record<string, unknown> & Action;
    const body: Action = raw;

    // Optional shared-cache write-through hints. Clients ask the server to
    // record the fresh result into aurzo_core.ai_cache_shared by passing a
    // sanitized cache key + logical action. Writes use the service role so
    // RLS on the shared table can stay locked down (clients can SELECT but
    // can't INSERT/UPDATE/DELETE — see migration 0013).
    const cacheSharedKey = typeof raw.cache_shared_key === 'string'
      ? raw.cache_shared_key : null;
    const cacheSharedAction = typeof raw.cache_shared_action === 'string'
      ? raw.cache_shared_action : null;
    const cacheSharedTtlMs = typeof raw.cache_shared_ttl_ms === 'number'
      ? raw.cache_shared_ttl_ms : null;

    // Service-role path: pg_cron dispatches with the service key. No end-user
    // JWT is involved, so we authenticate by comparing the bearer against the
    // injected SUPABASE_SERVICE_ROLE_KEY.
    if (body.action === 'cron_pulse' || body.action === 'daily_nudges') {
      const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const bearer = authHeader.replace(/^Bearer\s+/i, '');
      if (!serviceKey || bearer !== serviceKey) {
        return json({ error: body.action + ' requires service role' }, 403, cors);
      }
      const admin = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey);
      if (body.action === 'cron_pulse') {
        return json(await cronPulse(body, admin), 200, cors);
      }
      return json(await dailyNudges(body.target_user_id, anthropic, admin), 200, cors);
    }

    const supa = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await supa.auth.getUser();
    if (!user) return json({ error: 'unauthorized' }, 401, cors);

    if (body.action === 'advise' && body.stream) {
      return streamAdvise(body, cors);
    }
    if (body.action === 'surface_pulse') {
      return json(await surfacePulse(body, user.id, supa), 200, cors);
    }

    const result = await handle(body);

    // Shared cache write-through. Best-effort; we never fail the user's
    // request if the cache write trips. Skipped when the caller didn't
    // ask for it (cache_shared_key / cache_shared_action both required).
    if (cacheSharedKey && cacheSharedAction) {
      void writeSharedCache(
        cacheSharedAction,
        cacheSharedKey,
        body,
        result,
        cacheSharedTtlMs,
      );
    }

    return json(result, 200, cors);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error';
    return json({ error: msg }, 500, cors);
  }
});

async function handle(body: Action): Promise<unknown> {
  switch (body.action) {
    case 'gift_ideas':   return giftIdeas(body);
    case 'date_ideas':   return dateIdeas(body);
    case 'compose':      return compose(body);
    case 'advise':       return advise(body);
    case 'weekly_pulse': return weeklyPulse(body);
    case 'surface_pulse':
    case 'cron_pulse':
    case 'daily_nudges':
      throw new Error(body.action + ' handled inline');
  }
}

// Streaming advise — emits raw text chunks over a chunked HTTP response.
// Client reads with ReadableStream and appends to the UI as chunks arrive.
function streamAdvise(
  b: Extract<Action, { action: 'advise' }>,
  cors: Record<string, string>,
): Response {
  const userMsg = buildAdviseUserMsg(b);
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        const resp = anthropic.messages.stream({
          model: 'claude-sonnet-4-6',
          max_tokens: 600,
          system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
          messages: [{ role: 'user', content: userMsg }],
        });
        for await (const event of resp) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        controller.close();
      } catch (e) {
        controller.enqueue(encoder.encode(
          '\n[AI error: ' + (e instanceof Error ? e.message : 'unknown') + ']',
        ));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', ...cors },
  });
}

// surface_pulse — generates the Sunday pulse and writes it as an
// aurzo_core.notification for the requesting user. The client can render it
// immediately; pg_cron calls cron_pulse below for the batched weekly run.
async function surfacePulse(
  b: Extract<Action, { action: 'surface_pulse' }>,
  userId: string,
  supa: ReturnType<typeof createClient>,
): Promise<unknown> {
  return writePulse(
    { people: b.people, dates: b.dates },
    userId,
    supa,
    { dedupDays: 0 },
  );
}

// cron_pulse — called by pg_cron with the service role. Loads the target
// user's people/dates from Relationship OS, dedups against the last 6 days,
// then generates + writes the notification.
async function cronPulse(
  b: Extract<Action, { action: 'cron_pulse' }>,
  admin: ReturnType<typeof createClient>,
): Promise<unknown> {
  const userId = b.target_user_id;

  const { data: people, error: pErr } = await admin
    .schema('relationship_os')
    .from('people')
    .select('full_name, relationship_type, notes, life_context, last_contacted_at')
    .eq('owner_id', userId)
    .limit(40);
  if (pErr) throw pErr;
  if (!people || people.length === 0) return { skipped: 'no_people' };

  const horizon = new Date();
  horizon.setDate(horizon.getDate() + 30);
  const { data: dates, error: dErr } = await admin
    .schema('relationship_os')
    .from('important_dates')
    .select('label, event_date')
    .eq('owner_id', userId)
    .lte('event_date', horizon.toISOString().slice(0, 10))
    .order('event_date', { ascending: true })
    .limit(10);
  if (dErr) throw dErr;

  return writePulse(
    {
      people: (people ?? []).map((p) => ({
        full_name: p.full_name as string,
        relationship_type: p.relationship_type as string | null,
        notes: p.notes as string | null,
        life_context: p.life_context as Record<string, unknown> | null,
        last_contacted_at: p.last_contacted_at as string | null,
      })),
      dates: (dates ?? []).map((d) => ({
        label: d.label as string,
        event_date: d.event_date as string,
      })),
    },
    userId,
    admin,
    { dedupDays: 6 },
  );
}

async function writePulse(
  ctx: { people: PersonCtx[]; dates?: DateCtx[] },
  userId: string,
  client: ReturnType<typeof createClient>,
  opts: { dedupDays: number },
): Promise<unknown> {
  if (opts.dedupDays > 0) {
    const cutoff = new Date(Date.now() - opts.dedupDays * 86400_000).toISOString();
    const { count } = await client
      .schema('aurzo_core')
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('category', 'weekly_pulse')
      .gte('created_at', cutoff);
    if ((count ?? 0) > 0) return { skipped: 'deduped' };
  }

  const pulse = await weeklyPulse({
    action: 'weekly_pulse',
    people: ctx.people,
    dates: ctx.dates,
  }) as { person_name: string; message: string; suggested_action?: string };

  if (!pulse || !pulse.message) return { skipped: 'no_pulse' };

  const { data, error } = await client
    .schema('aurzo_core')
    .from('notifications')
    .insert({
      user_id: userId,
      app_id: 'relationship_os',
      title: `Thinking of ${pulse.person_name}`,
      body: pulse.message + (pulse.suggested_action ? '\n\n→ ' + pulse.suggested_action : ''),
      category: 'weekly_pulse',
      priority: 'normal',
    })
    .select()
    .single();
  if (error) throw error;
  return { created: true, notification: data };
}

function buildAdviseUserMsg(b: Extract<Action, { action: 'advise' }>): string {
  const ctx = (b.people ?? []).slice(0, 30).map((p) => {
    const last = p.last_contacted_at ? ` — last contact ${p.last_contacted_at.slice(0, 10)}` : '';
    return `- ${p.full_name} (${p.relationship_type ?? 'friend'})${last}${p.notes ? '. Notes: ' + p.notes.slice(0, 140) : ''}`;
  }).join('\n');
  const dates = (b.dates ?? []).slice(0, 10).map((d) =>
    `- ${d.label} (${d.event_date}${d.days_until != null ? `, in ${d.days_until}d` : ''})`,
  ).join('\n');
  return `The user asked: "${b.question}"

Their people:
${ctx || '(no people yet)'}

Upcoming dates:
${dates || '(none)'}

Respond in plain prose. 2-5 sentences. Reference specific people or dates when it helps.`;
}

// ---------- cheap actions (Haiku 4.5) ----------

async function giftIdeas(b: Extract<Action, { action: 'gift_ideas' }>) {
  // Two prompt paths. When interest_tags is supplied (shared-cache mode),
  // we MUST NOT reference full_name or notes — the result lands in a
  // cross-user row, so every prompt input becomes part of what other
  // users effectively see. Sanitized prompt is purely shape-based.
  const sharedMode = Array.isArray(b.interest_tags) && b.interest_tags.length > 0;
  const userMsg = sharedMode
    ? `Suggest 5 gift ideas. Generic — do not invent or assume a name. Return STRICT JSON.

Recipient relationship: ${b.person.relationship_type ?? 'friend'}
Recipient interests: ${b.interest_tags!.join(', ')}
Budget: ${b.budget ? `~$${b.budget}` : 'flexible'}
Occasion: ${b.occasion ?? 'general'}`
    : `Suggest 5 gift ideas for this person. Return STRICT JSON matching the schema.

Person: ${b.person.full_name}
Relationship: ${b.person.relationship_type ?? 'unspecified'}
Notes: ${b.person.notes ?? 'none yet'}
Interests / context: ${b.person.interests ?? ''}
Budget: ${b.budget ? `~$${b.budget}` : 'flexible'}
Occasion: ${b.occasion ?? 'general'}`;

  return callJson('claude-haiku-4-5', userMsg, 500, {
    type: 'object',
    additionalProperties: false,
    required: ['ideas'],
    properties: {
      ideas: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['title', 'reason'],
          properties: {
            title: { type: 'string' },
            reason: { type: 'string' },
            estimated_cost: { type: 'number' },
          },
        },
      },
    },
  });
}

async function dateIdeas(b: Extract<Action, { action: 'date_ideas' }>) {
  const userMsg = `Suggest 5 date ideas for a couple. STRICT JSON per schema.

Shared interests: ${(b.shared_interests ?? []).join(', ') || 'unspecified'}
Budget: ${b.budget ?? 'any'}
Location: ${b.location ?? 'flexible'}`;

  return callJson('claude-haiku-4-5', userMsg, 500, {
    type: 'object', additionalProperties: false, required: ['ideas'],
    properties: {
      ideas: {
        type: 'array',
        items: {
          type: 'object', additionalProperties: false,
          required: ['title', 'why', 'cost'],
          properties: {
            title: { type: 'string' },
            why: { type: 'string' },
            cost: { type: 'string' },
          },
        },
      },
    },
  });
}

async function weeklyPulse(b: Extract<Action, { action: 'weekly_pulse' }>) {
  const lines = b.people.slice(0, 40).map((p) => {
    const last = p.last_contacted_at ? ` (last: ${p.last_contacted_at.slice(0, 10)})` : '';
    return `- ${p.full_name}${last} — ${p.relationship_type ?? 'friend'}${p.notes ? ': ' + p.notes.slice(0, 80) : ''}`;
  }).join('\n');
  const upcoming = (b.dates ?? []).slice(0, 10).map((d) =>
    `- ${d.label} (${d.event_date}${d.days_until != null ? `, in ${d.days_until}d` : ''})`,
  ).join('\n');

  const userMsg = `It is Sunday morning. Pick ONE person from this list who most deserves nurturing this week and write a warm 2-3 sentence pulse for the user. STRICT JSON.

People:
${lines}

Upcoming dates:
${upcoming || '(none)'}`;

  return callJson('claude-haiku-4-5', userMsg, 400, {
    type: 'object', additionalProperties: false,
    required: ['person_name', 'message'],
    properties: {
      person_name: { type: 'string' },
      message: { type: 'string' },
      suggested_action: { type: 'string' },
    },
  });
}

// ---------- quality actions (Sonnet 4.6) ----------

async function compose(b: Extract<Action, { action: 'compose' }>) {
  const userMsg = `Draft THREE distinct message variants for the user to send.

Recipient: ${b.person.full_name}
Relationship: ${b.person.relationship_type ?? 'friend'}
What the user knows about them: ${b.person.notes ?? 'not much yet'}
Occasion: ${b.occasion}
Tone: ${b.tone}
Channel: ${b.channel}

Write each variant as if the user is sending it — first person, ready to paste.
Vary the opening line meaningfully between variants.
STRICT JSON.`;

  return callJson('claude-sonnet-4-6', userMsg, 900, {
    type: 'object', additionalProperties: false, required: ['variants'],
    properties: {
      variants: {
        type: 'array',
        items: { type: 'string' },
      },
    },
  });
}

async function advise(b: Extract<Action, { action: 'advise' }>) {
  const userMsg = buildAdviseUserMsg(b);
  const resp = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 600,
    system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: userMsg }],
  });
  return { reply: textOf(resp) };
}

// ---------- helpers ----------

async function callJson(
  model: string,
  userMsg: string,
  maxTokens: number,
  schema: Record<string, unknown>,
): Promise<unknown> {
  const resp = await anthropic.messages.create({
    model,
    max_tokens: maxTokens,
    system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: userMsg }],
    output_config: { format: { type: 'json_schema', schema } },
  });
  const text = textOf(resp);
  try { return JSON.parse(text); } catch { return { _raw: text }; }
}

function textOf(resp: Anthropic.Message): string {
  return resp.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n');
}

// Write a fresh AI response into the cross-user shared cache. The client
// supplies the (sanitized) key + action — we never derive one server-side
// from the body, since the body may contain PII (names, notes) and we'd
// risk the cache row leaking that. TTL defaults to 7 days for parity with
// the per-user cache lifetimes used in aiService.ts. Failure is non-fatal.
async function writeSharedCache(
  action: string,
  cacheKey: string,
  body: Action,
  result: unknown,
  ttlMs: number | null,
): Promise<void> {
  try {
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const url = Deno.env.get('SUPABASE_URL');
    if (!serviceKey || !url) return;
    const admin = createClient(url, serviceKey);
    const ttl = ttlMs == null ? 7 * 24 * 60 * 60 * 1000 : ttlMs;
    const expires_at = ttl > 0 ? new Date(Date.now() + ttl).toISOString() : null;
    await admin
      .schema('aurzo_core')
      .from('ai_cache_shared')
      .upsert(
        {
          platform: 'relationship_os',
          action,
          cache_key: cacheKey,
          input_params: sanitizeParams(body),
          result: result as Record<string, unknown>,
          model: modelForAction(body.action),
          expires_at,
          last_used_at: new Date().toISOString(),
        },
        { onConflict: 'platform,cache_key' },
      );
  } catch (e) {
    console.warn('[shared-cache] write failed:', e);
  }
}

// We don't store the raw request body — it can include names/notes that
// must never land in a cross-user row. Just record action + a short shape
// hint useful for ops/debugging.
function sanitizeParams(body: Action): Record<string, unknown> {
  switch (body.action) {
    case 'date_ideas':
      return {
        action: body.action,
        budget: body.budget ?? null,
        location: body.location ?? null,
        interests_count: (body.shared_interests ?? []).length,
      };
    case 'gift_ideas':
      return {
        action: body.action,
        relationship_type: body.person.relationship_type ?? null,
        budget: body.budget ?? null,
        occasion: body.occasion ?? null,
        tags_count: (body.interest_tags ?? []).length,
      };
    default:
      return { action: body.action };
  }
}

function modelForAction(action: Action['action']): string {
  switch (action) {
    case 'compose':
    case 'advise':       return 'claude-sonnet-4-6';
    case 'gift_ideas':
    case 'date_ideas':
    case 'weekly_pulse': return 'claude-haiku-4-5';
    default:             return 'unknown';
  }
}

function json(body: unknown, status: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors },
  });
}

function corsHeaders(_req: Request): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}
