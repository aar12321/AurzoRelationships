-- 0010_universal_backend.sql
-- AurzoMorning universal backend layer — Part 2 of the platform spec.
-- Extends aurzo_core.profiles with spec-required columns (minus the two
-- that conflict with "one user, many platforms": has_seen_tour and
-- platform both belong on aurzo_core.app_access, which is already per-app
-- per-user and already has a jsonb preferences column we're using for
-- tour_seen_at as of commit bd85fbc).

set search_path = aurzo_core, public;

-- ---------- 1. Extend aurzo_core.profiles ----------

alter table aurzo_core.profiles
  add column if not exists has_skipped_onboarding boolean not null default false,
  add column if not exists onboarding_answers jsonb not null default '{}'::jsonb,
  add column if not exists preferences jsonb not null default '{}'::jsonb;

comment on column aurzo_core.profiles.has_skipped_onboarding is
  'True if the user explicitly chose Skip during onboarding (distinct from onboarded_at which marks completion).';
comment on column aurzo_core.profiles.onboarding_answers is
  'Free-form JSON bag of answers collected during onboarding (first person name, goal, etc.). Schema is intentionally loose.';
comment on column aurzo_core.profiles.preferences is
  'Cross-platform user preferences (dark mode, density, notification opt-ins). Per-app prefs live on aurzo_core.app_access.preferences.';

-- ---------- 2. Universal AI response cache ----------
-- Every platform runs AI calls through this. Lookup by (user_id, platform,
-- cache_key); cache_key is a deterministic hash of the input parameters
-- (generated client-side). expires_at nullable for evergreen results.

create table if not exists aurzo_core.ai_cache (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null,
  cache_key text not null,
  input_params jsonb not null default '{}'::jsonb,
  result jsonb not null,
  model text,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  unique (user_id, platform, cache_key)
);

create index if not exists idx_ai_cache_lookup
  on aurzo_core.ai_cache (user_id, platform, cache_key);
create index if not exists idx_ai_cache_expiry
  on aurzo_core.ai_cache (expires_at) where expires_at is not null;

alter table aurzo_core.ai_cache enable row level security;

create policy "ai_cache_select_own" on aurzo_core.ai_cache
  for select using (user_id = auth.uid());
create policy "ai_cache_insert_own" on aurzo_core.ai_cache
  for insert with check (user_id = auth.uid());
create policy "ai_cache_update_own" on aurzo_core.ai_cache
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "ai_cache_delete_own" on aurzo_core.ai_cache
  for delete using (user_id = auth.uid());

-- ---------- 3. Universal search history ----------

create table if not exists aurzo_core.search_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null,
  query text not null,
  filters jsonb not null default '{}'::jsonb,
  result_count int,
  created_at timestamptz not null default now()
);

create index if not exists idx_search_history_recent
  on aurzo_core.search_history (user_id, platform, created_at desc);

alter table aurzo_core.search_history enable row level security;

create policy "search_history_select_own" on aurzo_core.search_history
  for select using (user_id = auth.uid());
create policy "search_history_insert_own" on aurzo_core.search_history
  for insert with check (user_id = auth.uid());
create policy "search_history_delete_own" on aurzo_core.search_history
  for delete using (user_id = auth.uid());

-- ---------- 4. Universal user selections (saved / bookmarks / watchlists) ----------

create table if not exists aurzo_core.user_selections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null,
  collection text not null,
  item_id text not null,
  item_type text,
  snapshot jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, platform, collection, item_id)
);

create index if not exists idx_user_selections_collection
  on aurzo_core.user_selections (user_id, platform, collection, created_at desc);

alter table aurzo_core.user_selections enable row level security;

create policy "user_selections_select_own" on aurzo_core.user_selections
  for select using (user_id = auth.uid());
create policy "user_selections_insert_own" on aurzo_core.user_selections
  for insert with check (user_id = auth.uid());
create policy "user_selections_update_own" on aurzo_core.user_selections
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "user_selections_delete_own" on aurzo_core.user_selections
  for delete using (user_id = auth.uid());

-- ---------- 5. Expose new tables to PostgREST ----------
-- The client's coreClient uses the aurzo_core schema, so these tables
-- become available via coreClient.from('ai_cache'/'search_history'/
-- 'user_selections') the moment PostgREST reloads the schema cache.
notify pgrst, 'reload schema';
