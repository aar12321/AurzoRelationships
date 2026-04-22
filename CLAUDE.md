# CLAUDE.md — Aurzo Relationship OS

## Build Philosophy
- Never attempt to build more than ONE module per session
- Always confirm the current module is complete and committed
  before starting the next
- If context feels long or responses slow, run /compact before
  continuing
- Never proceed to a new file while an existing file has
  unresolved TODOs

## Module Build Order (strict sequence)
1. Project scaffold + Supabase schema + auth wiring
2. People Directory & Profiles
3. Important Dates & Reminders
4. Relationship Health Tracker
5. Gift Planner & Idea Bank
6. Outreach & Message Composer
7. Shared Experiences & Memory Log
8. Event & Gathering Planner
9. Couples & Partnership Mode
10. AI Relationship Advisor
11. Polish pass — animations, empty states, loading skeletons

## Session Rules
- Start every session by stating which module you are on
- End every session with: commit all changes, write a SHORT
  summary of what was done, and list the next 3 tasks
- If a task will touch more than 3 files, break it into
  subtasks first
- Never generate an entire page in one shot — scaffold
  structure first, then fill sections

## File Size Rules
- No single component file should exceed 250 lines
- If a component grows beyond 250 lines, split it before
  continuing
- Keep API call logic in /services, never inline in components
- All relationship data is deeply personal — enforce RLS
  in Supabase on every table from day one

## Timeout Prevention
- Do not generate more than ~150 lines of code per response
- If a function is complex, stub it with a TODO comment and
  implement in the next message
- Prefer multiple small responses over one large response
- Always pause and confirm before starting any database
  migration

## Context Management
- Use /compact aggressively — run it at the start of every
  new module
- Use /clear only between fully separate modules
- Keep one Claude Code session per major module
- Couples mode is a separate data layer — always build
  solo modules first before touching shared data

## Definition of Done (per module)
A module is only "done" when:
- [ ] All screens render without errors
- [ ] Data reads and writes to Supabase correctly
- [ ] Loading and empty states exist
- [ ] Mobile layout is verified
- [ ] Privacy — no person's data leaks into another
      user's view under any condition
- [ ] Changes are committed with a clear message

## Tech Stack
- React + TypeScript (web), React Native (mobile — later)
- Tailwind CSS with warm palette (cream, terracotta, gold, charcoal)
- Zustand for state (active person, health cache, event state)
- Supabase (Postgres + Auth + Storage) with RLS on every table
- Anthropic Claude API for composer, gifts, dates, advisor, pulse
- Shared Aurzo SSO for auth

## Design Direction
- Warm cream / soft ivory backgrounds
- Deep terracotta and dusty gold accents, warm charcoal text
- Elegant serif for names + section headers, humanist sans for body
- Mood: intimate journal, never clinical
- Empty states: always invitations, never failures

## Route Map
- /relationships                       → Dashboard
- /relationships/people                → People directory
- /relationships/people/new            → Add person
- /relationships/people/:id            → Person profile
- /relationships/people/:id/memories   → Shared memories
- /relationships/people/:id/gifts      → Gift ideas + history
- /relationships/people/:id/messages   → Outreach composer
- /relationships/dates                 → Important dates
- /relationships/health                → Relationship health
- /relationships/events                → Events & gatherings
- /relationships/events/new            → Create event
- /relationships/events/:id            → Event detail
- /relationships/gifts                 → Gift hub
- /relationships/memories              → Memory log
- /relationships/couples               → Couples mode
- /relationships/advisor               → AI advisor
- /relationships/settings              → Preferences
