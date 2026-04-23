-- Integrate with the pre-existing Aurzo identity layer.
--
-- This project already has:
--   public.user_profiles      — canonical per-user profile used by
--                                finance, cooking, academic modules
--   public.user_memberships   — global Aurzo membership + tier
--   public.membership_plans   — plan catalog
--   public.handle_new_aurzo_user (trigger on auth.users)
--                             — provisions user_profiles + free membership
--
-- Rather than fork that, we sync public.user_profiles → aurzo_core.profiles
-- one-way so Relationship OS and any future aurzo_core-aware app sees the
-- same identity. public.user_profiles remains the write surface.

-- ---------- backfill existing users ----------

insert into aurzo_core.profiles (id, email, full_name, display_name, avatar_url, phone, timezone)
select up.user_id, up.email, up.full_name, up.display_name, up.avatar_url,
       up.phone, coalesce(up.timezone, 'UTC')
from public.user_profiles up
on conflict (id) do update set
  email        = excluded.email,
  full_name    = excluded.full_name,
  display_name = excluded.display_name,
  avatar_url   = excluded.avatar_url,
  phone        = excluded.phone,
  timezone     = coalesce(excluded.timezone, aurzo_core.profiles.timezone);

-- ---------- sync trigger on public.user_profiles ----------

create or replace function aurzo_core.sync_profile_from_user_profiles()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into aurzo_core.profiles (id, email, full_name, display_name, avatar_url, phone, timezone)
  values (
    new.user_id, new.email, new.full_name, new.display_name,
    new.avatar_url, new.phone, coalesce(new.timezone, 'UTC')
  )
  on conflict (id) do update set
    email        = excluded.email,
    full_name    = excluded.full_name,
    display_name = excluded.display_name,
    avatar_url   = excluded.avatar_url,
    phone        = excluded.phone,
    timezone     = coalesce(excluded.timezone, aurzo_core.profiles.timezone),
    updated_at   = now();
  return new;
end; $$;

drop trigger if exists aurzo_core_sync_profile on public.user_profiles;
create trigger aurzo_core_sync_profile
  after insert or update on public.user_profiles
  for each row execute function aurzo_core.sync_profile_from_user_profiles();

-- ---------- rewire aurzo_core.on_auth_user_created ----------
-- public.handle_new_aurzo_user already creates user_profiles + membership.
-- Our trigger only needs to seed aurzo_core.app_access for every app,
-- since those are the new tables that the legacy trigger doesn't know about.

create or replace function aurzo_core.on_auth_user_created()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into aurzo_core.app_access (user_id, app_id)
  select new.id, a.id from aurzo_core.apps a where a.is_active
  on conflict do nothing;
  return new;
end; $$;

-- Backfill app_access for all existing users too.
insert into aurzo_core.app_access (user_id, app_id)
select u.id, a.id
from auth.users u
cross join aurzo_core.apps a
where a.is_active
on conflict do nothing;

-- ---------- unified entitlement view ----------
-- Combines the legacy global membership with any per-app aurzo_core entitlements.

create or replace view aurzo_core.v_effective_entitlements as
with legacy as (
  select
    um.user_id,
    null::text as app_id,
    mp.name as tier,
    mp.features,
    um.current_period_end,
    um.status,
    'membership'::text as source
  from public.user_memberships um
  join public.membership_plans mp on mp.id = um.plan_id
),
app_level as (
  select user_id, app_id, tier, features, current_period_end,
         case when cancelled_at is not null then 'cancelled' else 'active' end as status,
         'entitlement'::text as source
  from aurzo_core.entitlements
)
select * from legacy union all select * from app_level;

grant select on aurzo_core.v_effective_entitlements to authenticated;
