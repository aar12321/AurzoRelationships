-- 0012_relationship_tiers.sql
-- Module 4 Phase B: priority tiers, per-person cadence, do-not-nudge override,
-- and social-capacity self-report.
--
-- All four columns are nullable / additive. Existing rows are unaffected and
-- the application reads `null` as "not set" everywhere. RLS is unchanged
-- (people-row policies in 0002_rls.sql already cover new columns).
--
-- Apply via: supabase db push   (or paste into the SQL editor in Supabase
-- Studio). No data backfill required.

-- ---------- new columns on people ----------

alter table public.people
  add column if not exists priority_tier text
    check (priority_tier in ('inner','close','casual')),
  add column if not exists cadence_days int
    check (cadence_days is null or cadence_days between 1 and 365),
  add column if not exists do_not_nudge_until timestamptz,
  add column if not exists social_capacity text
    check (social_capacity in ('low','steady','high'));

comment on column public.people.priority_tier is
  'User-set priority bucket. inner = inner circle (very few people), close = important, casual = nice-to-have. Null = unsorted.';
comment on column public.people.cadence_days is
  'Desired interval between meaningful interactions, in days. Null = follow fading_threshold_days default.';
comment on column public.people.do_not_nudge_until is
  'Override: nudges and reminders for this person are suppressed until this timestamp passes.';
comment on column public.people.social_capacity is
  'Per-person social-energy expectation set by the owner. Used to soften nudge cadence.';

-- ---------- partial index for the common "inner circle" dashboard query ----------

create index if not exists people_inner_circle_idx
  on public.people(owner_id)
  where priority_tier = 'inner';

-- ---------- nudge suppression view (optional convenience) ----------
--
-- Lets the daily nudges cron in 0009_nudges.sql skip muted people without
-- repeating the timestamp comparison everywhere. The cron job can be updated
-- in a follow-up migration to read from this view.

create or replace view public.people_nudgeable as
  select * from public.people
  where do_not_nudge_until is null
     or do_not_nudge_until < now();

-- people_nudgeable inherits RLS from public.people (security_invoker default).
alter view public.people_nudgeable set (security_invoker = true);
