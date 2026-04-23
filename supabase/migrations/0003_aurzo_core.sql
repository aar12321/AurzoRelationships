-- Aurzo Core — shared identity, entitlements, and cross-app surface.
-- Every Aurzo product (Relationship OS, Subscription Manager, Home Manager,
-- Women's Health, …) reads from this schema so a single auth.users row and
-- a single profile drive the entire ecosystem.

create schema if not exists aurzo_core;

-- ---------- canonical user profile (one row per auth.users) ----------

create table if not exists aurzo_core.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  display_name text,
  avatar_url text,
  phone text,
  timezone text not null default 'UTC',
  locale text not null default 'en-US',
  theme text not null default 'light' check (theme in ('light','dark','auto')),
  marketing_opt_in boolean not null default false,
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- app registry ----------
-- Every Aurzo product registers itself here. UI can render a unified app
-- switcher by reading this table.

create table if not exists aurzo_core.apps (
  id text primary key,
  name text not null,
  tagline text,
  description text,
  icon_url text,
  accent_color text,
  route text not null,
  is_active boolean not null default true,
  launched_at timestamptz,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

insert into aurzo_core.apps (id, name, tagline, route, accent_color, sort_order) values
  ('relationship_os','Relationship OS','The people who matter, remembered with care.','/relationships','#b0623f',10),
  ('subscription_mgr','Subscription Manager','See every subscription, stop the silent drain.','/subscriptions','#6a7f5a',20),
  ('home_mgr','Home Manager','The quiet operating system for your home.','/home','#8a6e3f',30),
  ('womens_health','Women''s Health','A gentle, private companion for your body.','/health','#a15267',40)
on conflict (id) do update set
  name = excluded.name,
  tagline = excluded.tagline,
  route = excluded.route,
  accent_color = excluded.accent_color,
  sort_order = excluded.sort_order;

-- ---------- per-user app access + preferences ----------

create table if not exists aurzo_core.app_access (
  user_id uuid not null references auth.users(id) on delete cascade,
  app_id text not null references aurzo_core.apps(id) on delete cascade,
  enabled boolean not null default true,
  role text not null default 'user' check (role in ('user','admin','beta')),
  preferences jsonb not null default '{}'::jsonb,
  first_used_at timestamptz,
  last_used_at timestamptz,
  primary key (user_id, app_id)
);

-- ---------- entitlements (plan + feature flags per user per app) ----------

create table if not exists aurzo_core.entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  app_id text references aurzo_core.apps(id) on delete cascade,
  tier text not null default 'free' check (tier in ('free','plus','pro','family','lifetime','enterprise')),
  features jsonb not null default '{}'::jsonb,
  seats int not null default 1,
  source text check (source in ('trial','stripe','apple','google','gift','admin','grandfathered')),
  external_id text,
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists entitlements_user_app_idx
  on aurzo_core.entitlements(user_id, app_id);

-- ---------- households (shared groups used by multiple apps) ----------
-- Relationship OS uses this for couples. Home Manager for families.
-- Women's Health for a trusted partner view. Subscription Manager for
-- shared-bill tracking.

create table if not exists aurzo_core.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null default 'family'
    check (kind in ('family','couple','roommates','team','custom')),
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists aurzo_core.household_members (
  household_id uuid not null references aurzo_core.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','admin','member','viewer')),
  invited_by uuid references auth.users(id),
  invited_at timestamptz,
  accepted_at timestamptz,
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

create table if not exists aurzo_core.household_invites (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references aurzo_core.households(id) on delete cascade,
  invited_by uuid not null references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'member',
  token text not null unique,
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------- cross-app activity log + notifications ----------

create table if not exists aurzo_core.activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  app_id text references aurzo_core.apps(id),
  kind text not null,
  title text,
  body text,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create index if not exists activity_user_time_idx
  on aurzo_core.activity_log(user_id, occurred_at desc);

create table if not exists aurzo_core.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  app_id text references aurzo_core.apps(id),
  title text not null,
  body text,
  action_url text,
  priority text not null default 'normal'
    check (priority in ('low','normal','high','urgent')),
  category text,
  read_at timestamptz,
  dismissed_at timestamptz,
  sent_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_unread_idx
  on aurzo_core.notifications(user_id, read_at);

create table if not exists aurzo_core.notification_prefs (
  user_id uuid not null references auth.users(id) on delete cascade,
  channel text not null check (channel in ('email','push','sms','in_app')),
  app_id text references aurzo_core.apps(id),
  category text not null default 'default',
  enabled boolean not null default true,
  quiet_hours_start time,
  quiet_hours_end time,
  primary key (user_id, channel, app_id, category)
);

-- ---------- sessions (informational — Supabase Auth holds the real token) ----------

create table if not exists aurzo_core.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  app_id text references aurzo_core.apps(id),
  device_name text,
  device_type text check (device_type in ('web','ios','android','desktop','other')),
  ip_address inet,
  user_agent text,
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  ended_at timestamptz
);

create index if not exists sessions_user_active_idx
  on aurzo_core.sessions(user_id, ended_at);

-- ---------- audit log (security-sensitive actions) ----------

create table if not exists aurzo_core.audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  app_id text references aurzo_core.apps(id),
  action text not null,
  resource_type text,
  resource_id text,
  metadata jsonb not null default '{}'::jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

-- ---------- feature flags ----------

create table if not exists aurzo_core.feature_flags (
  id text primary key,
  description text,
  enabled_globally boolean not null default false,
  rollout_percentage int not null default 0
    check (rollout_percentage between 0 and 100),
  created_at timestamptz not null default now()
);

create table if not exists aurzo_core.feature_flag_users (
  flag_id text not null references aurzo_core.feature_flags(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  enabled boolean not null default true,
  primary key (flag_id, user_id)
);

-- ---------- connected accounts (3rd-party OAuth links per user) ----------
-- Stripe customer, Google Calendar, Plaid item, Apple Health source, etc.

create table if not exists aurzo_core.connected_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  external_id text not null,
  scopes text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  connected_at timestamptz not null default now(),
  disconnected_at timestamptz,
  unique (user_id, provider, external_id)
);

-- ---------- updated_at triggers ----------

create or replace function aurzo_core.set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists profiles_updated_at on aurzo_core.profiles;
create trigger profiles_updated_at before update on aurzo_core.profiles
  for each row execute function aurzo_core.set_updated_at();

drop trigger if exists entitlements_updated_at on aurzo_core.entitlements;
create trigger entitlements_updated_at before update on aurzo_core.entitlements
  for each row execute function aurzo_core.set_updated_at();

-- ---------- auto-provision profile + default app_access on signup ----------

create or replace function aurzo_core.on_auth_user_created()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into aurzo_core.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name'
    ),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;

  insert into aurzo_core.app_access (user_id, app_id, first_used_at, last_used_at)
  select new.id, a.id, null, null
  from aurzo_core.apps a
  where a.is_active
  on conflict do nothing;

  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function aurzo_core.on_auth_user_created();

-- ---------- helper: current user has tier X on app Y ----------

create or replace function aurzo_core.has_tier(p_app text, p_min_tier text)
returns boolean language sql stable as $$
  with order_map(tier, rank) as (values
    ('free',0),('plus',1),('pro',2),('family',3),('lifetime',4),('enterprise',5))
  select coalesce(
    (select max(om.rank) >= (select rank from order_map where tier = p_min_tier)
     from aurzo_core.entitlements e
     join order_map om on om.tier = e.tier
     where e.user_id = auth.uid()
       and (e.app_id = p_app or e.app_id is null)
       and (e.current_period_end is null or e.current_period_end > now())
       and e.cancelled_at is null),
    false
  );
$$;

-- Expose aurzo_core to PostgREST (the Supabase REST API).
grant usage on schema aurzo_core to anon, authenticated, service_role;
grant select on aurzo_core.apps to anon, authenticated;
grant select, insert, update, delete on all tables in schema aurzo_core to authenticated;
alter default privileges in schema aurzo_core grant select, insert, update, delete on tables to authenticated;
