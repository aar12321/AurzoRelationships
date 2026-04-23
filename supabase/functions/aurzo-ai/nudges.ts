// Daily Nudges — proactive drift detection.
//
// Called by pg_cron via the daily_nudges action. For each user, scans
// people + important_dates for actionable signals and writes notifications:
//
//   • date_approaching   — important date within 7 days
//   • silent_90d         — 90+ days since last contact with a close relation
//
// Dedup: a stable action_url like "nudge:birthday:<id>" + a 7-day window
// guarantees we never emit the same nudge twice in the same week.
//
// Cost: at most ONE Haiku 4.5 call per user per day (and only when triggers
// fire). Detection is pure SQL/TS — no AI is spent on detection itself.

import type Anthropic from 'npm:@anthropic-ai/sdk@0.60.0';
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';

const SYSTEM_PROMPT_NUDGE = `You are the Aurzo Relationship Nudge writer.
Write SHORT, warm, specific in-app nudges (1-2 sentences max).
Never lecture. Never moralize. Reference the person by name and the trigger.
Output ONLY the message text — no greeting, no signoff, no quotes.`;

type Trigger = {
  person_id: string;
  person_name: string;
  kind: 'birthday' | 'anniversary' | 'date' | 'silent';
  trigger_label: string;     // human label, e.g. "birthday in 5 days"
  priority: 'normal' | 'high';
  action_url: string;        // stable dedup key + click target
  context: string;           // small context for the AI prompt
};

const CLOSE_TYPES = new Set(['partner', 'spouse', 'family', 'parent', 'child', 'sibling', 'close_friend', 'best_friend']);

export async function dailyNudges(
  targetUserId: string,
  anthropic: Anthropic,
  admin: SupabaseClient,
): Promise<unknown> {
  const triggers = await detectTriggers(targetUserId, admin);
  if (triggers.length === 0) return { skipped: 'no_triggers' };

  const fresh = await filterDeduped(triggers, targetUserId, admin);
  if (fresh.length === 0) return { skipped: 'all_deduped' };

  const messages = await composeNudgeMessages(fresh, anthropic);

  const rows = fresh.map((t, i) => ({
    user_id: targetUserId,
    app_id: 'relationship_os',
    title: titleFor(t),
    body: messages[i] ?? fallbackBody(t),
    action_url: t.action_url,
    category: 'nudge',
    priority: t.priority,
  }));

  const { data, error } = await admin
    .schema('aurzo_core')
    .from('notifications')
    .insert(rows)
    .select('id');
  if (error) throw error;

  return { created: data?.length ?? 0, triggers: fresh.length };
}

async function detectTriggers(userId: string, admin: SupabaseClient): Promise<Trigger[]> {
  const today = new Date();
  const horizon = new Date(today);
  horizon.setDate(horizon.getDate() + 7);

  // Important dates within 7 days. event_date is recurring annually, so we
  // compare month-day rather than the raw year.
  const { data: dates, error: dErr } = await admin
    .schema('relationship_os')
    .from('important_dates')
    .select('id, label, event_date, date_type, recurring, person_id, person:people!inner(id, full_name)')
    .eq('owner_id', userId);
  if (dErr) throw dErr;

  const out: Trigger[] = [];
  for (const d of dates ?? []) {
    const next = nextOccurrence(d.event_date as string, today, (d.recurring as boolean) ?? true);
    if (!next) continue;
    const days = daysBetween(today, next);
    if (days < 0 || days > 7) continue;

    const personRel = (d as unknown as { person: { id: string; full_name: string } | null }).person;
    if (!personRel) continue;

    const kind = (d.date_type as string) === 'anniversary' ? 'anniversary'
      : (d.date_type as string) === 'birthday' ? 'birthday' : 'date';

    out.push({
      person_id: personRel.id,
      person_name: personRel.full_name,
      kind,
      trigger_label: kind === 'birthday' ? `birthday in ${days}d`
        : kind === 'anniversary' ? `anniversary in ${days}d`
        : `${d.label} in ${days}d`,
      priority: days <= 1 ? 'high' : 'normal',
      action_url: `nudge:${kind}:${d.id}`,
      context: `${personRel.full_name}'s ${kind === 'date' ? d.label : kind} is in ${days} day${days === 1 ? '' : 's'}.`,
    });
  }

  // Silent 90+ days on close relationships.
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - 90);
  const { data: people, error: pErr } = await admin
    .schema('relationship_os')
    .from('people')
    .select('id, full_name, relationship_type, last_contacted_at, notes')
    .eq('owner_id', userId);
  if (pErr) throw pErr;

  for (const p of people ?? []) {
    if (!CLOSE_TYPES.has((p.relationship_type as string) ?? '')) continue;
    const last = p.last_contacted_at ? new Date(p.last_contacted_at as string) : null;
    if (last && last >= cutoff) continue;
    const daysSilent = last ? daysBetween(last, today) : 999;
    out.push({
      person_id: p.id as string,
      person_name: p.full_name as string,
      kind: 'silent',
      trigger_label: last ? `${daysSilent}d since contact` : 'no contact yet',
      priority: 'normal',
      action_url: `nudge:silent:${p.id}`,
      context: `You haven't contacted ${p.full_name} (${p.relationship_type}) in ${daysSilent === 999 ? 'a long time' : daysSilent + ' days'}.${p.notes ? ' Notes: ' + (p.notes as string).slice(0, 120) : ''}`,
    });
  }

  // Cap to keep prompts cheap.
  return out.slice(0, 8);
}

async function filterDeduped(
  triggers: Trigger[],
  userId: string,
  admin: SupabaseClient,
): Promise<Trigger[]> {
  if (triggers.length === 0) return triggers;
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400_000).toISOString();
  const refs = triggers.map((t) => t.action_url);

  const { data, error } = await admin
    .schema('aurzo_core')
    .from('notifications')
    .select('action_url')
    .eq('user_id', userId)
    .in('action_url', refs)
    .gte('created_at', sevenDaysAgo);
  if (error) throw error;

  const seen = new Set((data ?? []).map((r) => r.action_url as string));
  return triggers.filter((t) => !seen.has(t.action_url));
}

async function composeNudgeMessages(triggers: Trigger[], anthropic: Anthropic): Promise<string[]> {
  const numbered = triggers.map((t, i) => `${i + 1}. ${t.context}`).join('\n');
  const userMsg = `Write ONE short warm nudge for each numbered item below.
Return STRICT JSON: { "nudges": [{ "i": 1, "text": "..." }, ...] }
Each text is 1-2 sentences max, in second person ("you" referring to the user), specific to the person and trigger. No greeting, no signoff.

${numbered}`;

  const resp = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 60 * triggers.length + 100,
    system: [{ type: 'text', text: SYSTEM_PROMPT_NUDGE, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: userMsg }],
    output_config: {
      format: {
        type: 'json_schema',
        schema: {
          type: 'object', additionalProperties: false, required: ['nudges'],
          properties: {
            nudges: {
              type: 'array',
              items: {
                type: 'object', additionalProperties: false, required: ['i', 'text'],
                properties: { i: { type: 'integer' }, text: { type: 'string' } },
              },
            },
          },
        },
      },
    },
  });
  const text = resp.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text).join('\n');
  let parsed: { nudges: { i: number; text: string }[] };
  try { parsed = JSON.parse(text); } catch { return triggers.map(fallbackBody); }
  const byIndex = new Map(parsed.nudges.map((n) => [n.i, n.text]));
  return triggers.map((_, i) => byIndex.get(i + 1) ?? fallbackBody(triggers[i]));
}

function titleFor(t: Trigger): string {
  switch (t.kind) {
    case 'birthday':    return `${t.person_name}'s birthday is coming up`;
    case 'anniversary': return `${t.person_name}'s anniversary is coming up`;
    case 'date':        return `${t.person_name} — ${t.trigger_label}`;
    case 'silent':      return `It's been a while with ${t.person_name}`;
  }
}

function fallbackBody(t: Trigger): string {
  return t.context;
}

function nextOccurrence(eventDateIso: string, today: Date, recurring: boolean): Date | null {
  const [yr, mo, da] = eventDateIso.split('-').map((s) => Number(s));
  if (!recurring) {
    // One-off date: return as-is. Caller filters on whether it's within horizon.
    return new Date(yr, mo - 1, da);
  }
  const candidate = new Date(today.getFullYear(), mo - 1, da);
  if (candidate < startOfDay(today)) {
    candidate.setFullYear(today.getFullYear() + 1);
  }
  return candidate;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function daysBetween(a: Date, b: Date): number {
  const ms = startOfDay(b).getTime() - startOfDay(a).getTime();
  return Math.round(ms / 86400_000);
}
