-- Relocate Relationship OS tables from `public` into their own schema.
-- public.profiles is superseded by aurzo_core.profiles and is dropped.
-- shared_data.* (couples layer) stays where it is — still Relationship OS.

create schema if not exists relationship_os;

-- public.profiles is replaced by aurzo_core.profiles.
drop table if exists public.profiles cascade;

-- Move every Relationship OS table into the new schema.
do $$
declare
  t text;
  tbls text[] := array[
    'people','person_groups','person_group_members','important_dates',
    'interactions','gift_ideas','gifts_given','outreach_messages',
    'memories','memory_people','events','event_guests','event_tasks',
    'advisor_threads','advisor_messages'
  ];
begin
  foreach t in array tbls loop
    if exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = t
    ) then
      execute format('alter table public.%I set schema relationship_os', t);
    end if;
  end loop;
end $$;

-- Re-grant schema access to PostgREST roles so the REST API can see it.
grant usage on schema relationship_os to anon, authenticated, service_role;
grant select, insert, update, delete
  on all tables in schema relationship_os to authenticated;
alter default privileges in schema relationship_os
  grant select, insert, update, delete on tables to authenticated;

-- shared_data policies were already created in 0002_rls.sql; no change needed.

-- Activity-log helper: any Relationship OS interaction also writes a row
-- to aurzo_core.activity_log so the unified "Today" view can surface it
-- across apps without Relationship OS knowing about that view.
create or replace function relationship_os.on_interaction_logged()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into aurzo_core.activity_log (user_id, app_id, kind, title, metadata, occurred_at)
  values (
    new.owner_id,
    'relationship_os',
    'interaction_' || new.kind,
    null,
    jsonb_build_object(
      'person_id', new.person_id,
      'quality', new.quality,
      'duration_minutes', new.duration_minutes
    ),
    new.occurred_at
  );
  return new;
end; $$;

drop trigger if exists interaction_to_activity on relationship_os.interactions;
create trigger interaction_to_activity
  after insert on relationship_os.interactions
  for each row execute function relationship_os.on_interaction_logged();

-- Keep people.last_contacted_at in sync automatically.
create or replace function relationship_os.on_interaction_touch_person()
returns trigger language plpgsql as $$
begin
  update relationship_os.people
     set last_contacted_at = greatest(coalesce(last_contacted_at, 'epoch'::timestamptz), new.occurred_at)
   where id = new.person_id;
  return new;
end; $$;

drop trigger if exists interaction_touch_person on relationship_os.interactions;
create trigger interaction_touch_person
  after insert on relationship_os.interactions
  for each row execute function relationship_os.on_interaction_touch_person();
