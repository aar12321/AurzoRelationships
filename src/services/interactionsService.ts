import { supabase } from './supabase';
import type {
  Interaction,
  InteractionInput,
  InteractionQuality,
} from '@/types/interactions';
import { QUALITY_WEIGHT } from '@/types/interactions';
import type { Person, Strength } from '@/types/people';

const TABLE = 'interactions';

export async function listInteractions(personId?: string): Promise<Interaction[]> {
  let q = supabase
    .from(TABLE)
    .select('*')
    .order('occurred_at', { ascending: false });
  if (personId) q = q.eq('person_id', personId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Interaction[];
}

export async function logInteraction(
  input: InteractionInput,
  ownerId: string,
): Promise<Interaction> {
  const payload = {
    ...input,
    owner_id: ownerId,
    occurred_at: input.occurred_at ?? new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from(TABLE)
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data as Interaction;
}

export async function deleteInteraction(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) throw error;
}

// Richer strength derivation using interaction frequency + quality.
// Overrides the recency-only version in peopleService for users who have
// actually started logging interactions.
export function computeStrength(
  person: Person,
  interactions: Interaction[],
): Strength {
  const recent = interactions.filter((i) => i.person_id === person.id);
  if (recent.length === 0 && !person.last_contacted_at) return 'unknown';

  const fadeAt = person.fading_threshold_days ?? 30;
  const dormantAt = fadeAt * 3;
  const now = Date.now();

  const last = recent[0]?.occurred_at ?? person.last_contacted_at;
  if (!last) return 'unknown';
  const days = (now - new Date(last).getTime()) / 86_400_000;

  const recentScore = recent
    .filter((i) => (now - new Date(i.occurred_at).getTime()) / 86_400_000 <= fadeAt * 2)
    .reduce((s, i) => s + (QUALITY_WEIGHT[i.quality ?? 'quick'] ?? 1), 0);

  if (days > dormantAt) return 'dormant';
  if (days > fadeAt) return 'fading';
  if (recentScore >= 6) return 'thriving';
  return 'active';
}

export function lastContactLabel(iso: string | null): string {
  if (!iso) return 'No contact yet';
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (d <= 0) return 'Today';
  if (d === 1) return 'Yesterday';
  if (d < 7) return `${d}d ago`;
  if (d < 60) return `${Math.floor(d / 7)}w ago`;
  if (d < 365) return `${Math.floor(d / 30)}mo ago`;
  return `${Math.floor(d / 365)}y ago`;
}

export function qualityScore(q: InteractionQuality | null): number {
  return q ? QUALITY_WEIGHT[q] : 1;
}
