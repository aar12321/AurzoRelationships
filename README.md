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

## Privacy

Relationship data is deeply personal. Every table has RLS enabled and every row
is scoped to `owner_id = auth.uid()`. The `shared_data` schema (couples mode)
only exposes rows once both partners have explicitly consented to the link.
