// Search history — every executed search across the Aurzo ecosystem lands
// here. Per the AurzoMorning spec, a search is "executed" once the user has
// stopped typing and we have a query + a result count to record. Reads are
// scoped to the caller's user via RLS; writes carry PLATFORM_ID so a single
// Aurzo profile can maintain distinct histories per app.

import { coreClient, supabase } from './supabase';
import { PLATFORM_ID } from '@/constants/platform';

export type LoggedSearch = {
  id: string;
  query: string;
  filters: Record<string, unknown>;
  result_count: number | null;
  created_at: string;
};

export async function logSearch(
  query: string,
  resultCount: number | null,
  filters: Record<string, unknown> = {},
): Promise<void> {
  const trimmed = query.trim();
  if (!trimmed) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  try {
    await coreClient.from('search_history').insert({
      user_id: user.id,
      platform: PLATFORM_ID,
      query: trimmed,
      filters,
      result_count: resultCount,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[searchHistory] log failed:', err);
  }
}

export async function recentQueries(limit = 5): Promise<string[]> {
  const { data, error } = await coreClient
    .from('search_history')
    .select('query, created_at')
    .eq('platform', PLATFORM_ID)
    .order('created_at', { ascending: false })
    .limit(limit * 4); // over-fetch to de-dupe without a DB-side DISTINCT
  if (error) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const row of data ?? []) {
    const q = row.query.trim();
    const k = q.toLowerCase();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(q);
    if (out.length >= limit) break;
  }
  return out;
}

export async function clearSearchHistory(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await coreClient
    .from('search_history')
    .delete()
    .eq('user_id', user.id)
    .eq('platform', PLATFORM_ID);
}
