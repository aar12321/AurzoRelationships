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
  | { action: 'advise'; question: string; people?: PersonCtx[]; dates?: DateCtx[] }
  | { action: 'compose'; person: PersonCtx; occasion: string; tone: string; channel: string }
  | { action: 'gift_ideas'; person: PersonCtx; budget?: number; occasion?: string }
  | { action: 'date_ideas'; shared_interests?: string[]; budget?: string; location?: string }
  | { action: 'weekly_pulse'; people: PersonCtx[]; dates?: DateCtx[] };

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

    const supa = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await supa.auth.getUser();
    if (!user) return json({ error: 'unauthorized' }, 401, cors);

    const body: Action = await req.json();
    const result = await handle(body);
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
  }
}

// ---------- cheap actions (Haiku 4.5) ----------

async function giftIdeas(b: Extract<Action, { action: 'gift_ideas' }>) {
  const userMsg = `Suggest 5 gift ideas for this person. Return STRICT JSON matching the schema.

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
  const ctx = (b.people ?? []).slice(0, 30).map((p) => {
    const last = p.last_contacted_at ? ` — last contact ${p.last_contacted_at.slice(0, 10)}` : '';
    return `- ${p.full_name} (${p.relationship_type ?? 'friend'})${last}${p.notes ? '. Notes: ' + p.notes.slice(0, 140) : ''}`;
  }).join('\n');
  const dates = (b.dates ?? []).slice(0, 10).map((d) =>
    `- ${d.label} (${d.event_date}${d.days_until != null ? `, in ${d.days_until}d` : ''})`,
  ).join('\n');

  const userMsg = `The user asked: "${b.question}"

Their people:
${ctx || '(no people yet)'}

Upcoming dates:
${dates || '(none)'}

Respond in plain prose. 2-5 sentences. Reference specific people or dates when it helps.`;

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
