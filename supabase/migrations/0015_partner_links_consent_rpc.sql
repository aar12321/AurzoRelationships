-- Tighten partner_links consent semantics so a malicious user can't mark
-- the OTHER partner's consent on their behalf. The previous UPDATE policy
-- allowed either member to update any column — including the other party's
-- a_consented_at / b_consented_at — which is broken access control even
-- if the client wraps the call in a "side" check.
--
-- Fix in two parts:
--   1. A SECURITY DEFINER RPC that only ever flips the caller's OWN
--      consent column, and never overwrites a value already set
--      (coalesce). Returns the resulting row so the client can re-read.
--   2. Drop the broad partner_links_consent_update policy. There are no
--      other legitimate UPDATE paths on this table; revocation goes
--      through DELETE (partner_links_revoke). All consent changes now
--      MUST go through the RPC, which enforces caller identity in SQL.

set local search_path = shared_data, public;

create or replace function shared_data.accept_partner_link(p_link uuid)
returns shared_data.partner_links
language plpgsql
security definer
set search_path = shared_data, public
as $$
declare
  v_uid uuid := auth.uid();
  v_link shared_data.partner_links;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  select * into v_link from shared_data.partner_links where id = p_link;
  if not found then
    raise exception 'link not found' using errcode = 'P0002';
  end if;

  if v_uid = v_link.user_a then
    update shared_data.partner_links
       set a_consented_at = coalesce(a_consented_at, now())
     where id = p_link
     returning * into v_link;
  elsif v_uid = v_link.user_b then
    update shared_data.partner_links
       set b_consented_at = coalesce(b_consented_at, now())
     where id = p_link
     returning * into v_link;
  else
    raise exception 'not a member of this link' using errcode = '42501';
  end if;

  return v_link;
end;
$$;

revoke all on function shared_data.accept_partner_link(uuid) from public;
grant execute on function shared_data.accept_partner_link(uuid) to authenticated;

-- Remove the broad UPDATE policy. Direct UPDATE on partner_links is no
-- longer possible from a regular session — the SECURITY DEFINER RPC
-- above is the only sanctioned mutation path for consent.
drop policy if exists "partner_links_consent_update" on shared_data.partner_links;

comment on function shared_data.accept_partner_link(uuid) is
  'Flip the caller''s own consent column on a partner_links row. Caller identity comes from auth.uid() — no client-supplied side argument exists, by design.';
