import { supabase } from './supabase';
import type {
  GiftGiven, GiftGivenInput, GiftIdea, GiftIdeaInput,
} from '@/types/gifts';

export async function listIdeas(personId?: string): Promise<GiftIdea[]> {
  let q = supabase
    .from('gift_ideas')
    .select('*')
    .order('created_at', { ascending: false });
  if (personId) q = q.eq('person_id', personId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as GiftIdea[];
}

export async function createIdea(
  input: GiftIdeaInput,
  ownerId: string,
): Promise<GiftIdea> {
  const { data, error } = await supabase
    .from('gift_ideas')
    .insert({ ...input, owner_id: ownerId })
    .select()
    .single();
  if (error) throw error;
  return data as GiftIdea;
}

export async function updateIdea(
  id: string,
  patch: Partial<GiftIdeaInput>,
): Promise<GiftIdea> {
  const { data, error } = await supabase
    .from('gift_ideas')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as GiftIdea;
}

export async function deleteIdea(id: string): Promise<void> {
  const { error } = await supabase.from('gift_ideas').delete().eq('id', id);
  if (error) throw error;
}

export async function listGiven(personId?: string): Promise<GiftGiven[]> {
  let q = supabase
    .from('gifts_given')
    .select('*')
    .order('given_on', { ascending: false });
  if (personId) q = q.eq('person_id', personId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as GiftGiven[];
}

export async function logGiven(
  input: GiftGivenInput,
  ownerId: string,
): Promise<GiftGiven> {
  const { data, error } = await supabase
    .from('gifts_given')
    .insert({ ...input, owner_id: ownerId })
    .select()
    .single();
  if (error) throw error;
  return data as GiftGiven;
}

// Stub for the AI gift-suggestion feature. Returns 5 generic ideas
// anchored in the person's profile. A real implementation will proxy
// through a backend edge function that calls the Anthropic API.
export function draftIdeas(
  personName: string,
  interests: string,
  budget?: number,
): { title: string; reason: string }[] {
  const cap = budget ? `under $${budget}` : 'budget-friendly';
  const base = interests?.trim() || 'their interests';
  return [
    { title: `A handwritten letter`, reason: `Sometimes the best gift for ${personName} is the time and words of someone who remembers them.` },
    { title: `A small book tied to ${base}`, reason: `Personal, ${cap}, and shows you've been paying attention.` },
    { title: `An experience together`, reason: `Plan a shared afternoon — memories outlast objects.` },
    { title: `A thoughtful supply of something they love`, reason: `A month of their favorite coffee or tea, ${cap}.` },
    { title: `A curated playlist`, reason: `Free, deeply personal, and infinitely replayable.` },
  ];
}
