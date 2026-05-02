# Aurzo Relationship OS

A React + TypeScript + Vite + Supabase app for managing relationship data, memories, dates, events, and AI-assisted advice.

## Stack
- Frontend: React 18 + TypeScript + Vite, Tailwind, Zustand, react-router
- Backend: Supabase (Postgres + RLS + Auth + Storage + Edge Functions)
- AI: Anthropic via the `aurzo-ai` Deno edge function
- Email: Resend (configured but not yet exercised in code)

## Project Structure
- `src/features/*` — feature-scoped pages and components (people, memories, events, couples, onboarding, etc.)
- `src/services/*` — Supabase / API service layer
- `src/stores/*` — Zustand stores
- `src/components/*` — shared components (ConfirmModal, etc.)
- `supabase/migrations/*.sql` — schema, RLS policies, RPCs
- `supabase/functions/aurzo-ai/index.ts` — AI edge function (Anthropic tool-use, cache, CORS)

## Workflow
- `Dev` runs `npm install && npm run dev -- --host 0.0.0.0 --port 5173`

## Recent Hardening (2026-05-02)
A full audit produced `AUDIT_REPORT.md` (39 issues). All severity-Critical/High issues have been addressed:

- **A1** Edge function: replaced invalid `output_config` with Anthropic tool-use forced binding for strict JSON.
- **A3 / A18** `couplesService.acceptLink` now goes through SECURITY DEFINER RPC `shared_data.accept_partner_link(p_link uuid)` (migration 0015). The broad `partner_links_consent_update` RLS policy was dropped — direct UPDATE on `partner_links` is no longer possible from a session, eliminating the "mark the other partner's consent" exploit.
- **A4** Edge function CORS allow-list (localhost / *.replit.app / *.replit.dev / `REPLIT_DEV_DOMAIN` / `ALLOWED_ORIGINS`). Disallowed origins receive **no** `Access-Control-Allow-Origin` header (clean denial).
- **A5** `aiAdviseStream` requires an authenticated session (no anon fallback).
- **A11 / A12** Photo handling: `AddMemoryForm` actually exposes a photo input now; `CaptureMomentModal` toasts a warning when an upload silently fails.
- **A13** `do_not_nudge_until` anchored at end-of-day local time so the nudge resumes the next morning, not the same morning UTC.
- **A14** `firstName()` helper trims and collapses whitespace before splitting (handles leading whitespace, tabs, multiple spaces).
- **A16** `aiCache` SELECTs include explicit `user_id = caller` filter (defense-in-depth on top of RLS).
- **C1** `ConfirmModal` adds focus-trap (Tab cycles cancel↔confirm) and restores previous focus on close.
- **C11** `ProfileSections` uses `String()` coercion on jsonb `life_context` values to prevent React render errors on legacy non-string data.
- **D1** Server recomputes the shared cache key from a trusted server-side fingerprint of the request body. Client-supplied keys are no longer trusted, but client and server fingerprints stay byte-identical (matching field set, normalization, and `.filter(Boolean)`).
- **D6** `EventDetailPage` uses `Number(ev.budget).toFixed(0)` to handle Postgres numeric columns that arrive as strings.

## Deployment
- Production Supabase project: `lnvebvrayuveygycpolc`
- Edge function `aurzo-ai` is deployed and live.
- Migration 0015 has been applied to production DB.

## Known Limitations / Skipped Items
The following audit items were intentionally deferred (not severe enough to block, or require larger schema/UX changes):
- C5: signed-URL upgrade for memory photos (current bucket is public-read).
- C2: combobox refinement for tag-pickers.
- C7: client-side image downscale before upload.
- `.env.example` rotation (user explicitly accepted risk on disclosed dev secrets).

## Conventions
- All Supabase calls go through `src/services/`. Components import services, never the raw client.
- All security-sensitive mutations live in SECURITY DEFINER RPCs in `shared_data` schema.
- New AI actions added to the edge function MUST add their normalized fingerprint to `serverFingerprint()` AND the matching client `fingerprint` object — they must hash to identical values.
