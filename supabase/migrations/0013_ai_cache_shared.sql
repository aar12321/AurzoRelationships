-- 0013_ai_cache_shared.sql
-- Cross-user AI response cache. Sibling of aurzo_core.ai_cache (per-user),
-- but keyed on (platform, cache_key) only — no user_id — so a fresh model
-- response paid for by user A can satisfy user B's identical request.
--
-- Privacy boundary: this table is ONLY for queries whose fingerprint and
-- whose result contain no personal information. The fingerprint is built
-- client-side from sanitized inputs (e.g. for date_ideas: sorted shared
-- interest tags + budget bucket + location, never names or notes). All
-- writes are gated through the aurzo-ai edge function with the service
-- role; users can SELECT but never INSERT/UPDATE/DELETE, so the cache
-- can't be poisoned by a crafted client request.

create table if not exists aurzo_core.ai_cache_shared (
  id uuid primary key default gen_random_uuid(),
  platform text not null,
  action text not null,
  cache_key text not null,
  input_params jsonb not null default '{}'::jsonb,
  result jsonb not null,
  model text,
  hit_count integer not null default 0,
  created_at timestamptz not null default now(),
  last_used_at timestamptz not null default now(),
  expires_at timestamptz,
  unique (platform, cache_key)
);

create index if not exists idx_ai_cache_shared_lookup
  on aurzo_core.ai_cache_shared (platform, cache_key);
create index if not exists idx_ai_cache_shared_expiry
  on aurzo_core.ai_cache_shared (expires_at) where expires_at is not null;
create index if not exists idx_ai_cache_shared_action
  on aurzo_core.ai_cache_shared (platform, action, last_used_at desc);

alter table aurzo_core.ai_cache_shared enable row level security;

-- Any signed-in user can read shared cache hits.
create policy "ai_cache_shared_select_authenticated"
  on aurzo_core.ai_cache_shared
  for select
  to authenticated
  using (true);

-- No INSERT/UPDATE/DELETE policies for users — service role bypasses RLS,
-- so the edge function (running with SUPABASE_SERVICE_ROLE_KEY) is the
-- only writer. This is the privacy guarantee: clients cannot poison the
-- shared cache or write rows that embed PII.

-- Authenticated users can record a hit so we know which entries are
-- actually useful (drives future eviction / popularity-aware prefetch).
-- security definer so it works without explicit UPDATE policy.
create or replace function aurzo_core.touch_ai_cache_shared(
  p_platform text,
  p_cache_key text
) returns void
language plpgsql
security definer
set search_path = aurzo_core, public
as $$
begin
  update aurzo_core.ai_cache_shared
     set hit_count = hit_count + 1,
         last_used_at = now()
   where platform = p_platform
     and cache_key = p_cache_key;
end;
$$;

revoke all on function aurzo_core.touch_ai_cache_shared(text, text) from public;
grant execute on function aurzo_core.touch_ai_cache_shared(text, text) to authenticated;

comment on table aurzo_core.ai_cache_shared is
  'Cross-user AI response cache. Writes are service-role only; SELECT open to authenticated. Use only for fingerprints + results that contain no PII.';
