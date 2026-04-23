-- Daily Nudges cron
--
-- Every day at 08:00 UTC pg_cron invokes _cron.dispatch_daily_nudges(),
-- which fans out one POST per active Relationship OS user to the aurzo-ai
-- edge function with action=daily_nudges. The edge function scans that
-- user's people + important_dates, emits notifications for any drift
-- signals (upcoming birthday/anniversary, silent 90+ days on a close
-- relationship), and dedups against action_url so we never nag twice.
--
-- Relies on _cron.config rows (project_url, service_role_key) seeded by
-- 0008_cron_pulse.sql.

create or replace function _cron.dispatch_daily_nudges()
returns integer
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_url   text;
  v_key   text;
  v_user  uuid;
  v_count integer := 0;
begin
  select value into v_url from _cron.config where key = 'project_url';
  select value into v_key from _cron.config where key = 'service_role_key';

  if v_url is null or v_key is null or v_url = 'pending' or v_key = 'pending' then
    raise warning 'aurzo nudges: _cron.config not yet populated; skipping dispatch';
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
        'action',         'daily_nudges',
        'target_user_id', v_user
      ),
      timeout_milliseconds := 30000
    );
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$fn$;

revoke all on function _cron.dispatch_daily_nudges() from public, anon, authenticated;

-- Reset any prior registration (safe to re-run)
do $$
begin
  perform cron.unschedule('aurzo-daily-nudges')
  where exists (select 1 from cron.job where jobname = 'aurzo-daily-nudges');
exception when others then
  null;
end $$;

select cron.schedule(
  'aurzo-daily-nudges',
  '0 8 * * *',
  $cron$ select _cron.dispatch_daily_nudges() $cron$
);

-- Helper index: fast dedup lookup of recently-emitted nudges by action_url
create index if not exists notifications_nudge_ref_idx
  on aurzo_core.notifications (user_id, action_url, created_at desc)
  where action_url like 'nudge:%';
