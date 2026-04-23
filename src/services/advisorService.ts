import { supabase } from './supabase';
import type { AdvisorMessage, AdvisorThread } from '@/types/advisor';
import type { Person } from '@/types/people';
import type { ImportantDate } from '@/types/dates';
import { daysUntil } from '@/types/dates';

export async function listThreads(): Promise<AdvisorThread[]> {
  const { data, error } = await supabase
    .from('advisor_threads')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as AdvisorThread[];
}

export async function createThread(
  ownerId: string,
  title?: string,
): Promise<AdvisorThread> {
  const { data, error } = await supabase
    .from('advisor_threads')
    .insert({ owner_id: ownerId, title: title ?? null })
    .select()
    .single();
  if (error) throw error;
  return data as AdvisorThread;
}

export async function listMessages(threadId: string): Promise<AdvisorMessage[]> {
  const { data, error } = await supabase
    .from('advisor_messages')
    .select('*')
    .eq('thread_id', threadId)
    .order('created_at');
  if (error) throw error;
  return (data ?? []) as AdvisorMessage[];
}

export async function postMessage(
  threadId: string,
  ownerId: string,
  role: 'user' | 'assistant',
  content: string,
): Promise<AdvisorMessage> {
  const { data, error } = await supabase
    .from('advisor_messages')
    .insert({ thread_id: threadId, owner_id: ownerId, role, content })
    .select()
    .single();
  if (error) throw error;
  return data as AdvisorMessage;
}

// Local advisor — pattern-matches the user's question against their real
// data and returns a warm, specific reply. Production will swap this for
// a backend call that streams Anthropic responses with the full context.
export function localAdvise(
  question: string,
  people: Person[],
  dates: ImportantDate[],
): string {
  const q = question.toLowerCase();

  if (/who.*reach.*out|who should i/.test(q)) {
    const dormant = people
      .filter((p) => !p.last_contacted_at ||
        (Date.now() - new Date(p.last_contacted_at).getTime()) / 86_400_000 > 21)
      .slice(0, 3);
    if (dormant.length === 0) {
      return "You're actually doing well. No one is fading right now. You could just send one appreciation text to someone who made you smile this week.";
    }
    return `A few people have drifted:\n\n${dormant.map((p) => `• ${p.full_name} — it's been a while`).join('\n')}\n\nPick one. Keep it short: "You crossed my mind today. How are you?"`;
  }

  if (/plan|special|surprise/.test(q)) {
    return "Start with what they actually love, not what looks impressive. Ask yourself: when have they been most themselves around you? Plan for that version of them.";
  }

  if (/reconnect|long.*time|fallen out/.test(q)) {
    return "Don't lead with guilt or apology for the silence — that makes them do emotional work. Lead with something specific: a shared memory, or a small thing that made you think of them. Then a soft open: 'How have you been, really?'";
  }

  if (/hard.*message|difficult|conflict|fight/.test(q)) {
    return "Before you send anything, write what you actually feel — not what you want to win. Then re-read and ask: would I want to receive this? Soften the first line. Name one thing that's true about them that you respect. Then say your piece.";
  }

  const upcoming = dates
    .map((d) => ({ d, n: daysUntil(d) }))
    .filter((x) => x.n >= 0 && x.n <= 14)
    .sort((a, b) => a.n - b.n)
    .slice(0, 3);
  if (upcoming.length > 0) {
    return `Here's what's close:\n\n${upcoming.map(({ d, n }) => `• ${d.label} — ${n === 0 ? 'today' : `${n} days`}`).join('\n')}\n\nAny of these pulling at you?`;
  }

  return "I'm listening. Tell me who it's about and what's on your mind — the more specific, the better I can help.";
}
