import { supabase } from './supabase';
import type { BucketItem, CoupleCheckin, PartnerLink } from '@/types/couples';

// Couples tables live in the shared_data schema, not relationship_os.
const shared = supabase.schema('shared_data');

export async function myLink(): Promise<PartnerLink | null> {
  const { data, error } = await shared
    .from('partner_links')
    .select('*')
    .maybeSingle();
  if (error && error.code !== 'PGRST116') throw error;
  return (data as PartnerLink | null) ?? null;
}

export async function proposeLink(
  userA: string,
  userB: string,
): Promise<PartnerLink> {
  const { data, error } = await shared
    .from('partner_links')
    .insert({
      user_a: userA,
      user_b: userB,
      a_consented_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw error;
  return data as PartnerLink;
}

export async function acceptLink(
  linkId: string,
  side: 'a' | 'b',
): Promise<PartnerLink> {
  const field = side === 'a' ? 'a_consented_at' : 'b_consented_at';
  const { data, error } = await shared
    .from('partner_links')
    .update({ [field]: new Date().toISOString() })
    .eq('id', linkId)
    .select()
    .single();
  if (error) throw error;
  return data as PartnerLink;
}

export async function revokeLink(linkId: string): Promise<void> {
  const { error } = await shared.from('partner_links').delete().eq('id', linkId);
  if (error) throw error;
}

export async function listCheckins(linkId: string): Promise<CoupleCheckin[]> {
  const { data, error } = await shared
    .from('couple_checkins')
    .select('*')
    .eq('link_id', linkId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as CoupleCheckin[];
}

export async function addCheckin(
  linkId: string,
  authorId: string,
  connectionScore: number,
  appreciation: string,
): Promise<CoupleCheckin> {
  const { data, error } = await shared
    .from('couple_checkins')
    .insert({
      link_id: linkId,
      author_id: authorId,
      connection_score: connectionScore,
      appreciation,
    })
    .select()
    .single();
  if (error) throw error;
  return data as CoupleCheckin;
}

export async function listBucket(linkId: string): Promise<BucketItem[]> {
  const { data, error } = await shared
    .from('couple_bucket_list')
    .select('*')
    .eq('link_id', linkId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as BucketItem[];
}

export async function addBucket(linkId: string, title: string): Promise<BucketItem> {
  const { data, error } = await shared
    .from('couple_bucket_list')
    .insert({ link_id: linkId, title })
    .select()
    .single();
  if (error) throw error;
  return data as BucketItem;
}

export async function toggleBucket(id: string, done: boolean): Promise<void> {
  const { error } = await shared
    .from('couple_bucket_list')
    .update({ done, done_at: done ? new Date().toISOString() : null })
    .eq('id', id);
  if (error) throw error;
}

// Local stub for AI date idea generation. Real version proxies to Claude
// via a backend edge function with both partners' interests in context.
export function draftDateIdeas(
  sharedInterests: string[],
  budget?: 'low' | 'medium' | 'high',
  location?: string,
): { title: string; why: string; cost: string }[] {
  const where = location ?? 'near home';
  const cost = budget === 'high' ? '$$$' : budget === 'medium' ? '$$' : '$';
  const base = sharedInterests[0] ?? 'something you both love';
  return [
    { title: `A slow dinner ${where}`, why: `No phones, no rush. Bring one question you've never asked each other.`, cost },
    { title: `Walk + one new question`, why: `Thirty minutes of walking + one prompt from the advisor. Cheap, great.`, cost: '$' },
    { title: `Afternoon tied to ${base}`, why: `Lean into something already shared — the evening writes itself.`, cost },
    { title: `Cook a dish from a place you want to visit`, why: `Low-stakes adventure. Bonus: leftovers.`, cost: '$' },
    { title: `Revisit a memory`, why: `Go back to the spot of an early date. Notice what's changed.`, cost: '$' },
  ];
}
