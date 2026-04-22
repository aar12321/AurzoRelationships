-- Aurzo Relationship OS — initial schema
-- Privacy-first: RLS enforced on every table. All rows scoped to owner_id = auth.uid().
-- Couples mode lives in shared_data schema and requires mutual consent before linking.

create extension if not exists "pgcrypto";

-- ---------- helpers ----------

create or replace function public.set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ---------- profile ----------

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  ai_tone text default 'warm' check (ai_tone in ('warm','direct','minimal')),
  theme text default 'light' check (theme in ('light','dark')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- people ----------

create table if not exists public.people (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null,
  photo_url text,
  relationship_type text check (relationship_type in (
    'close_friend','family','partner','mentor',
    'colleague','acquaintance','reconnecting'
  )),
  relationship_goal text check (relationship_goal in (
    'maintain','deepen','reconnect','let_drift'
  )),
  how_we_met text,
  met_on date,
  location text,
  birthday date,
  life_context jsonb not null default '{}'::jsonb,
  communication_pref text check (communication_pref in (
    'call','text','in_person','video','letter','no_preference'
  )),
  notes text,
  custom_fields jsonb not null default '[]'::jsonb,
  fading_threshold_days int,
  last_contacted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists people_owner_idx on public.people(owner_id);
create index if not exists people_birthday_idx on public.people(owner_id, birthday);

create trigger people_updated_at before update on public.people
for each row execute function public.set_updated_at();

-- ---------- groups (circles) ----------

create table if not exists public.person_groups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text,
  created_at timestamptz not null default now()
);

create table if not exists public.person_group_members (
  group_id uuid not null references public.person_groups(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  primary key (group_id, person_id)
);

-- ---------- important dates ----------

create table if not exists public.important_dates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  person_id uuid references public.people(id) on delete cascade,
  label text not null,
  date_type text not null check (date_type in (
    'birthday','anniversary','work_anniversary','sobriety','surgery',
    'graduation','due_date','new_job','moving','exam','holiday','custom'
  )),
  event_date date not null,
  recurring boolean not null default true,
  lead_times int[] not null default '{14,7,3,0}',
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists dates_owner_idx on public.important_dates(owner_id, event_date);

-- ---------- interactions (health log) ----------

create table if not exists public.interactions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  kind text not null check (kind in (
    'call','text','in_person','video','letter','event'
  )),
  quality text check (quality in ('quick','meaningful','deep')),
  duration_minutes int,
  notes text,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists interactions_person_idx
  on public.interactions(owner_id, person_id, occurred_at desc);

-- ---------- gifts ----------

create table if not exists public.gift_ideas (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  title text not null,
  reason text,
  url text,
  estimated_cost numeric(10,2),
  source text check (source in ('manual','ai','link','photo')) default 'manual',
  status text check (status in ('idea','planned','given','skipped')) default 'idea',
  created_at timestamptz not null default now()
);

create table if not exists public.gifts_given (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  title text not null,
  occasion text,
  given_on date not null,
  cost numeric(10,2),
  reaction text,
  created_at timestamptz not null default now()
);

-- ---------- outreach messages ----------

create table if not exists public.outreach_messages (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  occasion text not null,
  tone text not null,
  channel text not null,
  body text not null,
  sent_at timestamptz,
  follow_up_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------- memories ----------

create table if not exists public.memories (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text,
  note text,
  memory_type text check (memory_type in (
    'adventure','milestone','everyday','tradition','first_time','last_time'
  )),
  mood text,
  location text,
  occurred_on date,
  photo_urls text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.memory_people (
  memory_id uuid not null references public.memories(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  primary key (memory_id, person_id)
);

-- ---------- events ----------

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  event_type text check (event_type in (
    'dinner','party','trip','reunion','celebration','other'
  )),
  starts_at timestamptz,
  ends_at timestamptz,
  location text,
  cover_photo_url text,
  budget numeric(10,2),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.event_guests (
  event_id uuid not null references public.events(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  rsvp text check (rsvp in ('invited','confirmed','declined','maybe')) default 'invited',
  primary key (event_id, person_id)
);

create table if not exists public.event_tasks (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  done boolean not null default false,
  sort_order int not null default 0
);

-- ---------- advisor chat ----------

create table if not exists public.advisor_threads (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text,
  created_at timestamptz not null default now()
);

create table if not exists public.advisor_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.advisor_threads(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  created_at timestamptz not null default now()
);

-- ---------- couples (shared data) ----------
-- Separate schema. Data only becomes visible once BOTH partners confirm the link.

create schema if not exists shared_data;

create table if not exists shared_data.partner_links (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references auth.users(id) on delete cascade,
  user_b uuid not null references auth.users(id) on delete cascade,
  a_consented_at timestamptz,
  b_consented_at timestamptz,
  active boolean generated always as (
    a_consented_at is not null and b_consented_at is not null
  ) stored,
  created_at timestamptz not null default now(),
  unique (user_a, user_b)
);

create table if not exists shared_data.couple_checkins (
  id uuid primary key default gen_random_uuid(),
  link_id uuid not null references shared_data.partner_links(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  connection_score int check (connection_score between 1 and 10),
  appreciation text,
  created_at timestamptz not null default now()
);

create table if not exists shared_data.couple_bucket_list (
  id uuid primary key default gen_random_uuid(),
  link_id uuid not null references shared_data.partner_links(id) on delete cascade,
  title text not null,
  done boolean not null default false,
  done_at timestamptz,
  created_at timestamptz not null default now()
);
