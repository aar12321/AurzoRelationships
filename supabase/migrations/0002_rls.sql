-- Aurzo Relationship OS — Row Level Security
-- Rule: every owner_id column is scoped to auth.uid().
-- Couples data is only visible when the partner_link is active (both consented)
-- AND the requesting user is one of the two partners.

-- ---------- enable RLS everywhere ----------

alter table public.profiles                enable row level security;
alter table public.people                  enable row level security;
alter table public.person_groups           enable row level security;
alter table public.person_group_members    enable row level security;
alter table public.important_dates         enable row level security;
alter table public.interactions            enable row level security;
alter table public.gift_ideas              enable row level security;
alter table public.gifts_given             enable row level security;
alter table public.outreach_messages       enable row level security;
alter table public.memories                enable row level security;
alter table public.memory_people           enable row level security;
alter table public.events                  enable row level security;
alter table public.event_guests            enable row level security;
alter table public.event_tasks             enable row level security;
alter table public.advisor_threads         enable row level security;
alter table public.advisor_messages        enable row level security;
alter table shared_data.partner_links      enable row level security;
alter table shared_data.couple_checkins    enable row level security;
alter table shared_data.couple_bucket_list enable row level security;

-- ---------- profile ----------

create policy "profiles_self_select" on public.profiles
  for select using (id = auth.uid());
create policy "profiles_self_upsert" on public.profiles
  for insert with check (id = auth.uid());
create policy "profiles_self_update" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- ---------- owner-scoped policies ----------
-- Applied uniformly: select/insert/update/delete scoped to owner_id = auth.uid().

do $$
declare
  t text;
  tables text[] := array[
    'people','person_groups','person_group_members','important_dates',
    'interactions','gift_ideas','gifts_given','outreach_messages',
    'memories','memory_people','events','event_guests','event_tasks',
    'advisor_threads','advisor_messages'
  ];
begin
  foreach t in array tables loop
    execute format($f$
      create policy "%1$s_owner_select" on public.%1$I
        for select using (owner_id = auth.uid());
      create policy "%1$s_owner_insert" on public.%1$I
        for insert with check (owner_id = auth.uid());
      create policy "%1$s_owner_update" on public.%1$I
        for update using (owner_id = auth.uid())
        with check (owner_id = auth.uid());
      create policy "%1$s_owner_delete" on public.%1$I
        for delete using (owner_id = auth.uid());
    $f$, t);
  end loop;
end $$;

-- ---------- couples: partner_links ----------

create policy "partner_links_visible_to_members" on shared_data.partner_links
  for select using (auth.uid() in (user_a, user_b));

create policy "partner_links_create_self" on shared_data.partner_links
  for insert with check (auth.uid() = user_a);

create policy "partner_links_consent_update" on shared_data.partner_links
  for update using (auth.uid() in (user_a, user_b))
  with check (auth.uid() in (user_a, user_b));

create policy "partner_links_revoke" on shared_data.partner_links
  for delete using (auth.uid() in (user_a, user_b));

-- ---------- couples: shared tables ----------
-- Readable only when link is active AND requester is a member.

create or replace function shared_data.is_active_link_member(p_link uuid)
returns boolean language sql stable as $$
  select exists (
    select 1 from shared_data.partner_links
    where id = p_link
      and active
      and auth.uid() in (user_a, user_b)
  );
$$;

create policy "checkins_members_select" on shared_data.couple_checkins
  for select using (shared_data.is_active_link_member(link_id));
create policy "checkins_author_insert" on shared_data.couple_checkins
  for insert with check (
    author_id = auth.uid() and shared_data.is_active_link_member(link_id)
  );
create policy "checkins_author_update" on shared_data.couple_checkins
  for update using (author_id = auth.uid())
  with check (author_id = auth.uid());
create policy "checkins_author_delete" on shared_data.couple_checkins
  for delete using (author_id = auth.uid());

create policy "bucket_members_select" on shared_data.couple_bucket_list
  for select using (shared_data.is_active_link_member(link_id));
create policy "bucket_members_insert" on shared_data.couple_bucket_list
  for insert with check (shared_data.is_active_link_member(link_id));
create policy "bucket_members_update" on shared_data.couple_bucket_list
  for update using (shared_data.is_active_link_member(link_id))
  with check (shared_data.is_active_link_member(link_id));
create policy "bucket_members_delete" on shared_data.couple_bucket_list
  for delete using (shared_data.is_active_link_member(link_id));
