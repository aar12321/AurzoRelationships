-- Aurzo Core — Row Level Security
-- Apps table is a public read-only registry. Everything else is scoped
-- to the requesting user, with an explicit exception for household
-- members who can see rows of other members within their household.

alter table aurzo_core.profiles              enable row level security;
alter table aurzo_core.apps                  enable row level security;
alter table aurzo_core.app_access            enable row level security;
alter table aurzo_core.entitlements          enable row level security;
alter table aurzo_core.households            enable row level security;
alter table aurzo_core.household_members     enable row level security;
alter table aurzo_core.household_invites     enable row level security;
alter table aurzo_core.activity_log          enable row level security;
alter table aurzo_core.notifications         enable row level security;
alter table aurzo_core.notification_prefs    enable row level security;
alter table aurzo_core.sessions              enable row level security;
alter table aurzo_core.audit_log             enable row level security;
alter table aurzo_core.feature_flags         enable row level security;
alter table aurzo_core.feature_flag_users    enable row level security;
alter table aurzo_core.connected_accounts    enable row level security;

-- ---------- profiles: own row only ----------

create policy "profiles_self_select" on aurzo_core.profiles
  for select using (id = auth.uid());
create policy "profiles_self_insert" on aurzo_core.profiles
  for insert with check (id = auth.uid());
create policy "profiles_self_update" on aurzo_core.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- Household members can see each other's basic profile (for avatars/names).
create policy "profiles_household_select" on aurzo_core.profiles
  for select using (
    exists (
      select 1
      from aurzo_core.household_members m1
      join aurzo_core.household_members m2
        on m1.household_id = m2.household_id
      where m1.user_id = auth.uid() and m2.user_id = aurzo_core.profiles.id
    )
  );

-- ---------- apps: public registry ----------

create policy "apps_public_read" on aurzo_core.apps
  for select using (true);

-- ---------- feature flags: public read, self-scoped overrides ----------

create policy "flags_public_read" on aurzo_core.feature_flags
  for select using (true);

create policy "flag_users_self_select" on aurzo_core.feature_flag_users
  for select using (user_id = auth.uid());

-- ---------- user-scoped tables ----------
-- All of these share the same simple "I own this row" rule.

do $$
declare
  t text;
  tbls text[] := array[
    'app_access','entitlements','activity_log','notifications',
    'notification_prefs','sessions','connected_accounts'
  ];
begin
  foreach t in array tbls loop
    execute format($f$
      create policy "%1$s_self_select" on aurzo_core.%1$I
        for select using (user_id = auth.uid());
      create policy "%1$s_self_insert" on aurzo_core.%1$I
        for insert with check (user_id = auth.uid());
      create policy "%1$s_self_update" on aurzo_core.%1$I
        for update using (user_id = auth.uid())
        with check (user_id = auth.uid());
      create policy "%1$s_self_delete" on aurzo_core.%1$I
        for delete using (user_id = auth.uid());
    $f$, t);
  end loop;
end $$;

-- Audit log is read-only from the user's side; writes only via service role.
create policy "audit_log_self_select" on aurzo_core.audit_log
  for select using (user_id = auth.uid());

-- ---------- households + members ----------

create or replace function aurzo_core.is_household_member(p_household uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from aurzo_core.household_members
    where household_id = p_household and user_id = auth.uid()
  );
$$;

create or replace function aurzo_core.is_household_admin(p_household uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from aurzo_core.household_members
    where household_id = p_household
      and user_id = auth.uid()
      and role in ('owner','admin')
  );
$$;

create policy "households_member_select" on aurzo_core.households
  for select using (aurzo_core.is_household_member(id));
create policy "households_owner_insert" on aurzo_core.households
  for insert with check (owner_id = auth.uid());
create policy "households_admin_update" on aurzo_core.households
  for update using (aurzo_core.is_household_admin(id))
  with check (aurzo_core.is_household_admin(id));
create policy "households_owner_delete" on aurzo_core.households
  for delete using (owner_id = auth.uid());

create policy "members_self_or_household_select" on aurzo_core.household_members
  for select using (
    user_id = auth.uid() or aurzo_core.is_household_member(household_id)
  );
create policy "members_admin_insert" on aurzo_core.household_members
  for insert with check (
    aurzo_core.is_household_admin(household_id) or user_id = auth.uid()
  );
create policy "members_admin_update" on aurzo_core.household_members
  for update using (aurzo_core.is_household_admin(household_id))
  with check (aurzo_core.is_household_admin(household_id));
create policy "members_self_or_admin_delete" on aurzo_core.household_members
  for delete using (
    user_id = auth.uid() or aurzo_core.is_household_admin(household_id)
  );

create policy "invites_admin_manage" on aurzo_core.household_invites
  for all using (
    aurzo_core.is_household_admin(household_id) or invited_by = auth.uid()
  ) with check (
    aurzo_core.is_household_admin(household_id) or invited_by = auth.uid()
  );
