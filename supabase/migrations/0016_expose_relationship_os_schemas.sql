-- 0016_expose_relationship_os_schemas.sql
-- Fixes the cluster of 406 Not Acceptable errors that were blocking
-- people-save, couples-load, and advisor-send (issues #7, #8, #10 in
-- the launch-day walkthrough).
--
-- Two layers had to be fixed; only one of them is SQL:
--
-- 1. PostgREST exposed schemas (NOT in this migration — project setting):
--    The Supabase project's PostgREST `db_schema` was set to
--    "public,graphql_public,parenting,health" only. Every relationship-os
--    table call from the client (`supabase.from('people')` with
--    `db: { schema: 'relationship_os' }`) was hitting an unexposed
--    schema and getting 406. Fixed via the Management API:
--      PATCH /v1/projects/{ref}/postgrest
--      { "db_schema": "public,graphql_public,parenting,health,
--                      relationship_os,shared_data,aurzo_core",
--        "db_extra_search_path": "public, extensions, parenting,
--                      health, relationship_os, shared_data, aurzo_core" }
--    A fresh Supabase project needs the same PATCH applied — there is
--    no SQL equivalent for this setting.
--
-- 2. Schema USAGE + table grants on `shared_data` (this migration):
--    `shared_data` schema had no USAGE grant for `authenticated`, which
--    silently denied every couples-page query before RLS could even
--    evaluate. The relationship_os schema already had the grants from
--    0005; shared_data was missed.

grant usage on schema shared_data to authenticated, anon;
grant select, insert, update, delete on all tables in schema shared_data
  to authenticated;
alter default privileges in schema shared_data
  grant select, insert, update, delete on tables to authenticated;

-- Idempotent re-grant on relationship_os in case any post-0005 migration
-- introduced a table that didn't pick up the default privileges.
grant usage on schema relationship_os to authenticated, anon;
grant select, insert, update, delete on all tables in schema relationship_os
  to authenticated;
alter default privileges in schema relationship_os
  grant select, insert, update, delete on tables to authenticated;
