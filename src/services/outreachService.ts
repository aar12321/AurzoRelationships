import { supabase } from './supabase';
import type {
  Channel, Occasion, OutreachInput, OutreachMessage, Tone,
} from '@/types/outreach';
import type { Person } from '@/types/people';

const TABLE = 'outreach_messages';

export async function listMessages(personId?: string): Promise<OutreachMessage[]> {
  let q = supabase.from(TABLE).select('*').order('created_at', { ascending: false });
  if (personId) q = q.eq('person_id', personId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as OutreachMessage[];
}

export async function saveMessage(
  input: OutreachInput,
  ownerId: string,
): Promise<OutreachMessage> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert({ ...input, owner_id: ownerId })
    .select()
    .single();
  if (error) throw error;
  return data as OutreachMessage;
}

export async function markSent(id: string): Promise<OutreachMessage> {
  const { data, error } = await supabase
    .from(TABLE)
    .update({ sent_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as OutreachMessage;
}

// Draft 3 message variants using simple templates. This is the local
// fallback — in production we proxy through the backend to Claude with
// the full person profile for real personalization.
export function draftVariants(
  p: Person,
  occasion: Occasion,
  tone: Tone,
  channel: Channel,
): string[] {
  const name = firstName(p.full_name);
  const pref = channelStyle(channel);
  const open = TONE_OPENER[tone];
  const intros: Record<Occasion, string[]> = {
    birthday: [
      `Happy birthday, ${name}! ${open} ${TONE_BIRTHDAY[tone]}`,
      `${name} — another lap around the sun. ${TONE_BIRTHDAY[tone]}`,
      `Thinking about you on your birthday. ${TONE_BIRTHDAY[tone]}`,
    ],
    check_in_hard_time: [
      `Hey ${name}, I've been thinking about you. I know things have been heavy. I'm here if you want to talk, or not talk — either way.`,
      `${name} — no pressure to respond. I just wanted you to know I'm holding you in my mind this week.`,
      `Thinking of you, ${name}. Whatever you need, whenever you need it.`,
    ],
    congratulations: [
      `${name}! Congratulations — this is huge and so earned. So happy for you.`,
      `I saw the news about ${name} — genuinely proud of you. You've worked for this.`,
      `Huge congrats, ${name}. Can't wait to hear the full story.`,
    ],
    long_time: [
      `Hey ${name} — it's been too long. You crossed my mind today and I realized I miss you. How have you been, really?`,
      `${name}, I don't want to keep being a stranger. What's good in your life these days?`,
      `No agenda, just wanted to say hi. Thinking of you.`,
    ],
    thank_you: [
      `${name}, I don't say this enough — thank you. Truly.`,
      `Just wanted to tell you: what you did meant more than you know.`,
      `Thank you, ${name}. For being someone I can count on.`,
    ],
    thinking_of_you: [
      `Hey ${name} — no reason, just thinking of you today.`,
      `${name} popped into my head and I wanted to say hi.`,
      `Hope you're good. Thinking of you.`,
    ],
    holiday: [
      `Happy holidays, ${name}. Hope the season is warm and the people you love are close.`,
      `${name} — sending love your way this season.`,
      `Wishing you a quiet, beautiful holiday.`,
    ],
    apology: [
      `${name}, I owe you an apology and I've been sitting with it. I'm sorry. Can we talk?`,
      `I was wrong. I'm sorry, ${name}. When you're ready, I'd love to make it right.`,
      `No excuses — I'm sorry for how I handled things. I'm listening when you're ready.`,
    ],
    sympathy: [
      `${name}, I'm so sorry for your loss. I'm holding you and your family in my thoughts. No need to respond.`,
      `There are no good words. Just know you're on my mind.`,
      `I'm here, ${name}. Today, next week, whenever you need.`,
    ],
  };
  return intros[occasion].map((body) => (pref ? `${pref}\n\n${body}` : body));
}

const TONE_OPENER: Record<Tone, string> = {
  warm: "It's been a minute.",
  funny: 'Hope your day is going better than my laundry pile.',
  heartfelt: 'I mean this deeply:',
  brief: '',
  formal: 'I hope this note finds you well.',
};

const TONE_BIRTHDAY: Record<Tone, string> = {
  warm: 'Hope today feels like everything you deserve.',
  funny: 'Try not to act your age.',
  heartfelt: 'I am so grateful you exist. Today and every day.',
  brief: 'Have a good one.',
  formal: 'Wishing you a year of health and meaningful work.',
};

function channelStyle(channel: Channel): string {
  if (channel === 'letter') return '(Handwritten, opening line)';
  if (channel === 'voice_note') return '(Voice note — speak it)';
  return '';
}

function firstName(n: string): string {
  return n.split(/\s+/)[0] ?? n;
}
