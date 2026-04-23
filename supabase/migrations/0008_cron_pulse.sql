-- Sunday Pulse cron
--
-- Every Sunday at 09:00 UTC, pg_cron runs _cron.dispatch_weekly_pulse(),
-- which reads a private (project_url, service_role_key) tuple from
-- _cron.config and fires one POST per active Relationship OS user at the
-- aurzo-ai edge function with action=cron_pulse. The edge function does the
-- actual model call (Haiku 4.5) and writes the result as a notification, so
-- the realtime bell lights up the next time the user opens any Aurzo app.
--
-- _cron.config is locked down: only the superuser running the migration and
-- the pg_cron dispatcher (running as postgres via SECURITY DEFINER) can read
-- the service-role key. No application role ever touches it.

create extension if not exists pg_cron;
create extension if not exists pg_net;

create schema if not exists _cron;
revoke all on schema _cron from public, anon, authenticated;

create table if not exists _cron.config (
  key   text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
revoke all on _cron.config from public, anon, authenticated;

-- Idempotent seed of the two rows the dispatcher expects. Values are filled
-- by the management API out-of-band and never committed.
insert into _cron.config (key, value) values
  ('project_url',      'pending'),
  ('service_role_key', 'pending')
on conflict (key) do nothing;

create or replace function _cron.dispatch_weekly_pulse()
returns integer
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_url  text;
  v_key  text;
  v_user uuid;
  v_count integer := 0;
begin
  select value into v_url from _cron.config where key = 'project_url';
  select value into v_key from _cron.config where key = 'service_role_key';

  if v_url is null or v_key is null or v_url = 'pending' or v_key = 'pending' then
    raise warning 'aurzo cron: _cron.config not yet populated; skipping dispatch';
    return 0;
  end if;

  for v_user in
    select aa.user_id
    from aurzo_core.app_access aa
    where aa.app_id = 'relationship_os' and aa.enabled = true
  loop
    perform net.http_post(
      url     := v_url || '/functions/v1/aurzo-ai',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || v_key
      ),
      body    := jsonb_build_object(
        'action',         'cron_pulse',
        'target_user_id', v_user
      ),
      timeout_milliseconds := 30000
    );
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$fn$;

revoke all on function _cron.dispatch_weekly_pulse() from public, anon, authenticated;

-- Drop any previously registered job with the same name so this migration
-- is safe to re-run.
do $$
begin
  perform cron.unschedule('aurzo-weekly-pulse')
  where exists (select 1 from cron.job where jobname = 'aurzo-weekly-pulse');
exception when others then
  null;
end $$;

select cron.schedule(
  'aurzo-weekly-pulse',
  '0 9 * * 0',
  $cron$ select _cron.dispatch_weekly_pulse() $cron$
);
