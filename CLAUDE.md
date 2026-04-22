# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

# CLAUDE.md — Aurzo Relationship OS

Aurzo Relationship OS is a private, personal relationship intelligence platform — not a social network. It remembers what the user forgets, prompts them when to reach out, and helps them show up better for the people who matter. All data is deeply personal; privacy is a first-class concern on every table, every query, every screen.

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

Do not skip ahead. Each module depends on primitives established by the ones before it (People is the root entity; Dates, Health, Gifts, Messages, Memories, Events all attach to a Person).

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

---

## Tech Architecture

Stack:
- **Frontend:** React + TypeScript, mobile-first via React Native
- **Styling:** Tailwind CSS
- **State:** Zustand (active person, relationship health cache, event state)
- **Backend:** Node.js / Express
- **DB:** PostgreSQL via Supabase — RLS enforced on every table
- **Auth:** Shared Aurzo SSO
- **AI:** Anthropic Claude API (message composer, gift suggestions,
  date ideas, advisor chat, weekly pulse, proactive nudges)
- **File Storage:** Supabase Storage (memory photos, event photos),
  strictly private per user
- **Offline:** Core people directory + upcoming dates cached via IndexedDB

External APIs (optional integrations):
- Google Contacts (import) and Google Calendar (dates sync)
- Apple Contacts / CalDAV (iOS sync)
- Giphy or similar (memory moments)

### Couples Mode Data Boundary
Couples mode is a **separate data layer** using a `shared_data` schema in
Supabase. Mutual consent is required before any data is linked between two
Aurzo accounts. Never mix solo person records with couples shared records
in the same query path. Build and stabilize all solo modules first.

### Privacy Invariants (do not violate)
- RLS policies on every table from day one, not retrofitted later
- Media in Supabase Storage is private per user; no public buckets
- No person's data can appear in another user's view under any condition —
  this is listed explicitly in the Definition of Done for every module
- Data export (PDF or JSON) must return only the requesting user's data

---

## Routes / Screen Map

```
/relationships                        → Dashboard (reach-out queue,
                                        upcoming dates, weekly pulse)
/relationships/people                 → People directory
/relationships/people/new             → Add person
/relationships/people/:id             → Person profile
/relationships/people/:id/memories    → Shared memories
/relationships/people/:id/gifts       → Gift ideas + history
/relationships/people/:id/messages    → Outreach composer
/relationships/dates                  → All important dates calendar
/relationships/health                 → Relationship health overview
/relationships/events                 → Event & gathering planner
/relationships/events/new             → Create event
/relationships/events/:id             → Event detail
/relationships/gifts                  → Gift hub (all upcoming occasions)
/relationships/memories               → Full memory log
/relationships/couples                → Couples & partnership mode
/relationships/advisor                → AI relationship advisor
/relationships/settings               → Preferences
```

Person is the root entity — most routes nest under `/people/:id`. The
dashboard (`/relationships`) is the composite view that pulls from Dates,
Health, and the AI advisor's weekly pulse.

---

## Module Notes (what each module owns)

1. **People Directory & Profiles** — root entity. Relationship type tags,
   profile context, communication preferences, relationship goal, custom
   fields, groups, last-contacted (auto-tracked from interaction logs),
   relationship strength signal.
2. **Important Dates & Reminders** — birthdays, anniversaries, life events,
   recurring + one-time. Advance-notice lead times are per-date. Surface
   "coming up this month" on dashboard.
3. **Relationship Health Tracker** — writes interaction logs; derives
   Thriving / Active / Fading / Dormant. Health is a feeling, not a
   number. Never guilt-based; nudges are warm. Reach-out queue of 3–5
   people on dashboard.
4. **Gift Planner & Idea Bank** — per-person idea bank, gift history,
   budget, group-gift coordinator, wishlist links, shipping reminders.
5. **Outreach & Message Composer** — AI generates 2–3 genuinely
   personalized variants per occasion, using profile context. Tone +
   channel selectors. Bulk holiday composer is personalized per person,
   never a group blast.
6. **Shared Experiences & Memory Log** — photo-forward memory feed,
   traditions tracker, "on this day", annual recap. Private by default.
7. **Event & Gathering Planner** — guest list from directory, RSVP,
   budget, tasks, day-of timeline, post-event memory capture.
8. **Couples & Partnership Mode** — connects two Aurzo accounts via the
   `shared_data` schema. Shared timeline, check-ins, love languages, date
   generator, bucket list, couples journal. Visually distinct layer.
9. **AI Relationship Advisor** — context-aware chat with access to the
   user's people, profiles, interaction history, upcoming dates. Proactive
   suggestion cards on dashboard. Weekly pulse on Sunday morning.

---

## Design Direction (enforce while building UI)
- **Aesthetic:** Warm cream / soft ivory backgrounds, deep terracotta and
  dusty gold accents, warm charcoal text — feels like a journal, not an app
- **Typography:** Elegant serif for names and section headers; clean
  humanist sans-serif for body/UI
- **Animations:** Person cards bloom in; logged interaction = soft warm
  pulse on profile; fading alerts arrive as gentle cards (never red
  badges); memory photos cross-fade; couples timeline scrolls like a
  photo album
- **Empty states** are invitations, not failures ("No memories yet — add
  your first one" with warm illustration)
- **Couples Mode** uses deeper warm tones, softer edges, more intimate
  spacing
- Tone across the product: warm, human, never clinical, never shaming

---

## Current Status

Repository is at initial scaffold stage. Next step per Module Build Order
is **Module 1: Project scaffold + Supabase schema + auth wiring**. Do not
begin module work until this CLAUDE.md has been committed and the user
has confirmed Module 1 should start.
