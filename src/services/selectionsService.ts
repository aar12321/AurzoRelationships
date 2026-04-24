// User selections — the spec's universal "saved / bookmarked / pinned" layer.
// Any feature that lets a user stash an item for later writes to
// aurzo_core.user_selections. Rows are keyed by (user_id, platform,
// collection, item_id), unique — so saving twice is a no-op by design.
//
// `collection` is a free-form namespace chosen by the caller:
//   'pinned_people'    — people they want top-of-mind
//   'gift_ideas'        — AI-generated gifts the user wants to keep
//   'date_ideas'        — same for date suggestions
//   'memories'          — favorited memories
// The spec encourages saving a `snapshot` of the item at save time so
// list renders don't need to re-fetch the source row.

import { coreClient, supabase } from './supabase';
import { PLATFORM_ID } from '@/constants/platform';

export type UserSelection = {
  id: string;
  platform: string;
  collection: string;
  item_id: string;
  item_type: string | null;
  snapshot: Record<string, unknown>;
  metadata: Record<string, unknown>;
  created_at: string;
};

export async function saveSelection(args: {
  collection: string;
  itemId: string;
  itemType?: string;
  snapshot?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  await coreClient.from('user_selections').upsert(
    {
      user_id: user.id,
      platform: PLATFORM_ID,
      collection: args.collection,
      item_id: args.itemId,
      item_type: args.itemType ?? null,
      snapshot: args.snapshot ?? {},
      metadata: args.metadata ?? {},
    },
    { onConflict: 'user_id,platform,collection,item_id' },
  );
}

export async function unsaveSelection(
  collection: string,
  itemId: string,
): Promise<void> {
  await coreClient
    .from('user_selections')
    .delete()
    .eq('platform', PLATFORM_ID)
    .eq('collection', collection)
    .eq('item_id', itemId);
}

export async function listCollection(collection: string): Promise<UserSelection[]> {
  const { data, error } = await coreClient
    .from('user_selections')
    .select('*')
    .eq('platform', PLATFORM_ID)
    .eq('collection', collection)
    .order('created_at', { ascending: false });
  if (error) return [];
  return (data ?? []) as UserSelection[];
}

export async function isItemSaved(
  collection: string,
  itemId: string,
): Promise<boolean> {
  const { data } = await coreClient
    .from('user_selections')
    .select('id')
    .eq('platform', PLATFORM_ID)
    .eq('collection', collection)
    .eq('item_id', itemId)
    .maybeSingle();
  return Boolean(data);
}
