# Aurzo Relationship OS

A private, thoughtful tool that helps you maintain and deepen the relationships
that matter most. Not a social network — a warm, personal layer that remembers
what you forget, nudges you when to reach out, and helps you show up better for
the people in your life.

## Status

**Module 1 complete** — project scaffold, Supabase schema with RLS, auth
wiring, and the full route shell.

Module build order (strict):

1. Project scaffold + Supabase schema + auth wiring ← done
2. People Directory & Profiles
3. Important Dates & Reminders
4. Relationship Health Tracker
5. Gift Planner & Idea Bank
6. Outreach & Message Composer
7. Shared Experiences & Memory Log
8. Event & Gathering Planner
9. Couples & Partnership Mode
10. AI Relationship Advisor
11. Polish pass

See [CLAUDE.md](./CLAUDE.md) for build rules.

## Stack

- React 18 + TypeScript + Vite
- Tailwind CSS (warm cream / terracotta / gold / charcoal palette)
- Zustand for client state
- Supabase (Postgres + Auth + Storage) with RLS on every table
- React Router
- Anthropic Claude API (advisor, composer, gift + date ideas, weekly pulse)

## Getting started

```bash
cp .env.example .env   # fill in Supabase URL + anon key
npm install
npm run dev
```

Apply migrations via the Supabase CLI:

```bash
supabase db push
```

## Deploy on Replit

1. Import this repo as a Replit project (auto-detected via `.replit`).
2. In Replit **Secrets**, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
   (values live in `.env.example`). Optionally set `VITE_AURZO_SSO_URL`.
   Never add `ANTHROPIC_API_KEY` here — it is server-only and lives in the
   Supabase edge function.
3. Click **Run** — Replit runs `npm install && npm run dev` on `0.0.0.0:5173`.
4. Click **Deploy → Static** — Replit runs `npm run build` and serves `dist/`.
   Deep links work because `dist/404.html` mirrors `index.html` (SPA fallback).

## Privacy

Relationship data is deeply personal. Every table has RLS enabled and every row
is scoped to `owner_id = auth.uid()`. The `shared_data` schema (couples mode)
only exposes rows once both partners have explicitly consented to the link.
