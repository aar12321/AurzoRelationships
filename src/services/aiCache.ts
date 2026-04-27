// Cache-first wrapper for AI calls. Every AI feature routes through here —
// cheap deterministic fingerprint of the input params → lookup in
// aurzo_core.ai_cache scoped to (user_id, platform, cache_key) → return
// if present and unexpired, otherwise call the fetcher and write-through.
//
// The AurzoMorning spec mandates this for every AI-generating feature
// across every platform. RLS already scopes reads/writes to the current
// user, so cache isolation is enforced at the DB, not here.

import { coreClient, supabase } from './supabase';
import { PLATFORM_ID } from '@/constants/platform';

export type CachedAiOptions = {
  action: string;            // logical operation name: 'gift_ideas', 'compose', …
  params: unknown;            // input fingerprint (canonicalized + hashed)
  ttlMs?: number | null;      // null = evergreen, undefined defaults to 1 day
  model?: string | null;      // optional model identifier
};

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 1 day

export async function cachedAi<T>(
  opts: CachedAiOptions,
  fetcher: () => Promise<T>,
): Promise<T> {
  // Anonymous users can't hit the cache (RLS requires a real auth.uid()),
  // so just pass through. This also protects us during initial page load
  // if a caller fires before the session is rehydrated.
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fetcher();

  const key = await buildCacheKey(opts.action, opts.params);

  // 1. Lookup
  const now = new Date().toISOString();
  const { data: hit } = await coreClient
    .from('ai_cache')
    .select('result, expires_at')
    .eq('platform', PLATFORM_ID)
    .eq('cache_key', key)
    .maybeSingle();

  if (hit && (!hit.expires_at || hit.expires_at > now)) {
    return hit.result as T;
  }

  // 2. Miss (or expired) — fetch fresh
  const fresh = await fetcher();

  // 3. Write-through. Failure is non-fatal — we still return the fresh result.
  const ttl = opts.ttlMs === undefined ? DEFAULT_TTL_MS : opts.ttlMs;
  const expires_at = ttl == null ? null : new Date(Date.now() + ttl).toISOString();
  try {
    await coreClient
      .from('ai_cache')
      .upsert(
        {
          user_id: user.id,
          platform: PLATFORM_ID,
          cache_key: key,
          input_params: asJson(opts.params),
          result: asJson(fresh),
          model: opts.model ?? null,
          expires_at,
        },
        { onConflict: 'user_id,platform,cache_key' },
      );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[aiCache] write failed:', err);
  }

  return fresh;
}

// SHA-256 of a stable canonical serialization. Key-sorted JSON so two calls
// with the same logical input always hit the same cache row, regardless of
// the order their callers built the object.
async function buildCacheKey(action: string, params: unknown): Promise<string> {
  const payload = canonicalize({ action, params });
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function canonicalize(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonicalize).join(',') + ']';
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonicalize(obj[k])).join(',') + '}';
}

function asJson<T>(value: T): unknown {
  // Supabase's .upsert types for jsonb columns accept `object`; we widen here
  // to keep the cachedAi<T> generic convenient at call sites.
  return value as unknown;
}

// Common TTL presets — use these at call sites so cache lifetimes are
// consistent and easy to audit.
export const TTL = {
  evergreen: null,
  minute5: 5 * 60 * 1000,
  hour1: 60 * 60 * 1000,
  day1: 24 * 60 * 60 * 1000,
  day7: 7 * 24 * 60 * 60 * 1000,
  day30: 30 * 24 * 60 * 60 * 1000,
} as const;

// ---------- Shared (cross-user) cache ----------
// Sibling of cachedAi above. Reads from aurzo_core.ai_cache_shared, which
// stores results keyed only on (platform, cache_key) — no user_id — so
// a fresh response paid for by user A satisfies user B's same request.
//
// Privacy contract: callers MUST pass a fingerprint with no PII. Writes
// happen server-side inside the aurzo-ai edge function with the service
// role; clients can never write to this table directly. The fetcher is
// expected to forward `cacheSharedKey` and `cacheSharedAction` to the
// edge function so it knows where to record the response on a miss.

export type SharedCacheOptions = {
  action: string;       // logical action name, also stored in the row
  params: unknown;       // sanitized fingerprint (no names, no notes, no ids)
};

export type SharedCacheCallback<T> = (cacheSharedKey: string) => Promise<T>;

export async function cachedAiShared<T>(
  opts: SharedCacheOptions,
  fetcher: SharedCacheCallback<T>,
): Promise<T> {
  const cacheKey = await buildCacheKey(opts.action, opts.params);

  // 1. Lookup. RLS allows any authenticated user to SELECT.
  const now = new Date().toISOString();
  const { data: hit } = await coreClient
    .from('ai_cache_shared')
    .select('result, expires_at')
    .eq('platform', PLATFORM_ID)
    .eq('cache_key', cacheKey)
    .maybeSingle();

  if (hit && (!hit.expires_at || hit.expires_at > now)) {
    // Best-effort hit recording. Failure is non-fatal.
    void coreClient.rpc('touch_ai_cache_shared', {
      p_platform: PLATFORM_ID,
      p_cache_key: cacheKey,
    });
    return hit.result as T;
  }

  // 2. Miss — fetcher must invoke the edge fn with cacheSharedKey so the
  //    server-side write-through lands in the row keyed identically.
  return fetcher(cacheKey);
}
