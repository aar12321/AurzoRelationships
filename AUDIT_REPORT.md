# Aurzo Relationship OS — Full Audit

**Scope:** comprehensive 5-phase audit (feature inventory, end-to-end flows, logic/correctness, integration/data, cross-cutting concerns).
**Mode:** audit-only — no code changes were made.
**Stack reviewed:** React 18 + TypeScript 5.5 + Vite 5, Zustand 4, react-router-dom 6, Tailwind, Supabase JS 2 (Postgres + Storage + Edge Functions), Anthropic SDK 0.60.0 (Deno runtime).
**Severity legend:** **CRITICAL** = data loss / security / outage · **HIGH** = broken feature or wrong behavior in normal use · **MEDIUM** = incorrect behavior in edge cases or significant UX defect · **LOW** = polish / cleanup / future risk.

---

## Phase 1 — Feature inventory

| Area | Surfaces | Key services | State |
|------|----------|--------------|-------|
| Auth | `LoginPage`, `RequireAuth`, `AuthProvider` | `auth.ts`, `supabase.ts`, `authStore` | Magic link + OAuth (Supabase) |
| People | `PeopleDirectoryPage`, `PersonProfilePage`, `AddPersonPage`, `EditPersonPage`, `AvatarUploader`, `QuickLogButton`, `ProfileSections` | `peopleService`, `avatarService`, `peopleStore` | CRUD + photo + groups + custom fields |
| Dates | `DatesPage`, `AddDateForm` | `datesService`, `datesStore` | Birthdays, anniversaries, recurring |
| Interactions | `LogInteractionForm` (Health), `QuickLogButton` (profile), Composer auto-log | `interactionsService`, `interactionsStore` | Kind + quality + notes |
| Memories | `MemoryLogPage`, `PersonMemoriesPage`, `AddMemoryForm`, `CaptureMomentModal` | `memoriesService`, `memoriesStore` | Free-text + optional photo + multi-person tags |
| Gifts | `GiftHubPage`, `PersonGiftsPage`, `AddGiftIdeaForm`, `MarkGivenModal`, `BudgetSnapshot` | `giftsService`, `giftsStore` | Ideas + given log + AI ideas (cached) |
| Outreach | `ComposerPage`, `RecentMessages` | `outreachService`, `aiService.aiCompose` | 3 variants (AI w/ local fallback) + auto-log |
| Events | `EventsPage`, `CreateEventPage`, `EventDetailPage` | `eventsService`, `eventsStore` | Guests + RSVP + tasks |
| Health | `HealthPage`, `ForecastPage`, `BalancePanel`, `SuggestionsPanel` | `interactionsService.computeStrength`, `forecastService`, `balanceService` | Pure derivations |
| Today | `TodayPage` | `todayFeedService` | Composed feed (dates / notifs / fading / streaks) |
| Dashboard | `Dashboard`, `InnerCirclePanel` | mix of stores | Pulse + upcoming + fading |
| Advisor | `AdvisorPage` | `advisorService`, `aiService.aiAdvise(Stream)` | Threaded chat, streaming |
| Couples | `CouplesPage` | `couplesService` (`shared_data` schema) | Two-party consent link, check-ins, bucket list |
| Notifications | `NotificationsPage`, `NotificationPrefsPanel` | `notificationsService`, `notificationsStore` | Realtime + per-channel + quiet hours |
| Map | `RelationshipMapPage` | `relationshipMapService` | Visual graph |
| Onboarding/Tour | `OnboardingFlow`, `FeatureTour` | `coreService`, `tourService`, `tourStore` | 4-step welcome + replayable tour |
| Search/Palette | `CommandPalette`, `useGlobalHotkeys` | `commandSearchService`, `searchHistoryService` | ⌘K + `/` + `?` |
| AI plumbing | edge fn `aurzo-ai` (Deno) | `aiService`, `aiCache` (per-user + shared) | Cached, model-routed |

No surface in the route map is unreachable; lazy loading is wired correctly through `Suspense` in `src/App.tsx`.

---

## Phase 2 — End-to-end flow notes

Flows confirmed by code-trace (no live reproduction performed beyond confirming dev server responds 200):

- **Sign in → land on `/relationships` (Today)** — `RequireAuth` waits for `loading=false` before redirecting; OK.
- **Add person → appears in directory & palette** — `peopleStore.add` writes via `peopleService.createPerson` and pushes onto local cache; `CommandPalette` reads the same store.
- **Log interaction → strength updates** — `interactionsStore.log` inserts and the `computeStrength` derivation runs on the live array (no refetch). Last-contact label updates synchronously on profile.
- **Compose → "I sent this" → Today/Health update** — Composer auto-logs an interaction (`ComposerPage.tsx:107-112`), so streaks and `last_contacted_at` reflect immediately.
- **Onboarding → first person → birthday → finish** — `OnboardingFlow` writes `profile.onboarded_at`; Dashboard's `onboarded_at == null` check returns to OnboardingFlow.
- **Forecast → close-only people sorted by urgency** — verified `closeSorted` gates on `CLOSE_TYPES` (partner/spouse/family/close_friend) and slices to 12.
- **Couples link → second-party consent unlocks check-ins/bucket list** — RLS enforces `is_active_link_member` server-side; client `myLink()` returns the row but UI is supposed to gate on `active`.

Multiple correctness/UX defects encountered in those traces are itemized in Phase 3.

---

## Phase 3 — Logic / correctness issues

### A1 — `output_config` is not a real Anthropic SDK parameter
**Severity:** HIGH
**Feature:** AI gift ideas, date ideas, weekly pulse, surface pulse (anything that goes through `callJson`)
**File:** `supabase/functions/aurzo-ai/index.ts:457-465`
**Repro:** Open Gift Hub, click any "Coming up" person → AI tries to return JSON → server calls `anthropic.messages.create({ ..., output_config: { format: { type: 'json_schema', schema } } })`.
**Root cause:** The Anthropic Messages API on SDK 0.60 has no `output_config` field. The SDK silently drops unknown top-level fields, so the call still succeeds but JSON output is enforced *only* by prose in the prompt. When Claude wraps the JSON in markdown fences or adds preamble, `JSON.parse(text)` throws and `callJson` returns `{ _raw: text }`. Downstream readers like `r.ideas ?? []` then yield an empty array — the AI silently appears "broken" with no error toast.
**Suggested fix:** Either (a) instruct Claude with explicit "respond with raw JSON only, no fences" + a strict JSON-stripping helper that finds the first `{` … last `}` before parsing, or (b) use Anthropic tool-use to bind output to a tool whose `input_schema` is the desired shape and read `tool_use.input`. Option (b) is the spec-supported path.

---

### A2 — `EditPersonPage` converts a date-only field with `new Date(...).toISOString()`
**Severity:** MEDIUM
**Feature:** Person profile editing — "Do not nudge until" field
**File:** `src/features/people/EditPersonPage.tsx:121-123`
**Repro:** Edit a person, set "Do not nudge until" to e.g. `2026-05-10`, save. Behind the user's back the value is parsed as `2026-05-10T00:00:00Z` (UTC midnight), which is the previous day in any negative-offset timezone (Americas). A user in Pacific time who sets May 10 sees the nudge resume on May 9 evening.
**Root cause:** `new Date('YYYY-MM-DD')` is parsed as UTC midnight by spec; `.toISOString()` then ships UTC. `birthday` (line 113) and `met_on` (similar pattern elsewhere) avoid the bug because they're stored as `date` columns and pass the bare string through.
**Suggested fix:** Pass the bare `YYYY-MM-DD` string straight through to a `date` column, OR compose a local-end-of-day timestamp: `new Date(\`${form.do_not_nudge_until}T23:59:59\`).toISOString()`.

---

### A3 — `couplesService.myLink()` uses `.maybeSingle()` with no filter
**Severity:** MEDIUM
**Feature:** Couples mode
**File:** `src/services/couplesService.ts:7-14`
**Repro:** A user who has ever been in two partner links (revoked one, started another, or the spec's bug below leaves both rows live) hits `Couples` page → `partner_links select * .maybeSingle()` returns 0 or many — when it's many, Supabase throws `PGRST116` (rows>1). The catch swallows only the *single* PGRST116 code; multi-row throws as a different code and bubbles up.
**Root cause:** Relies on RLS scoping rather than an explicit predicate; users can be in `(user_a, user_b)` of more than one row historically.
**Suggested fix:** Order by `created_at desc` and `.limit(1).maybeSingle()`, or filter `.eq('active', true)` and document the exclusivity invariant in the schema.

---

### A4 — CORS allows any origin on an authenticated edge function
**Severity:** MEDIUM (security smell; not exploitable on its own because every request requires a Supabase JWT)
**Feature:** All AI endpoints
**File:** `supabase/functions/aurzo-ai/index.ts:587-592`
**Root cause:** `Access-Control-Allow-Origin: '*'` is set on the function that proxies Claude. Combined with a leaked anon key (see G1) and a user with an active session in another tab, any origin can post to the function. Realistically the JWT bearer requirement gates it, but `*` plus credentials is a footgun for the future when you accept cookies or move to first-party tokens.
**Suggested fix:** Allow-list the deployed app origins (`replit.app`, Vercel, custom domains) and the local dev URL. Echo the `Origin` header back when it matches the allow-list.

---

### A5 — `aiAdviseStream` falls back to anon key when there's no session
**Severity:** LOW
**Feature:** Streaming advisor
**File:** `src/services/aiService.ts:280`
**Root cause:** `Authorization: Bearer ${session?.access_token ?? SUPABASE_KEY}` — when the session has expired, the request is still authenticated as the anon role. The edge function then calls `supa.auth.getUser()` which returns `null` and rejects, so this is *not* exploitable, but it (a) hides the real auth bug from the user and (b) could mis-route in any future endpoint that accepts anon callers.
**Suggested fix:** When `session?.access_token` is missing, throw locally with a "please sign in again" error instead of forging an anon-bearer request.

---

### A6 — `forecastService.computeCurrentStreak` allows skipping today AND yesterday silently
**Severity:** LOW (cosmetic — overstated streaks)
**Feature:** Health → Forecast → "Streaks worth celebrating"
**File:** `src/services/forecastService.ts:84-96`
**Repro:** Last interaction was 2 days ago. Loop iteration `i=0` (today, missing) is skipped via `continue`; `i=1` (yesterday, missing) breaks; result `streak=0`. **However** — if the user logged today + 3 days ago, the loop hits today (count=1), then misses yesterday and breaks → streak=1. This is correct. The actual bug is subtler: the comment "allow skipping today" is right, but the streak then runs back from *today* not from the most recent interaction. A user who logged Mon, Tue, Wed (3-day streak ending Wed) but skipped Thu and is checking Fri sees streak=0 instead of "3-day streak ending Wednesday".
**Suggested fix:** Anchor the streak walk on the most recent `interactionDays[max]` instead of "today minus i", so the streak label persists through the trailing gap day.

---

### A7 — `peopleStore.add` (and most stores) doesn't validate `ownerId` before insert
**Severity:** LOW (RLS protects the DB; UX is the surface)
**Feature:** All create flows
**File:** `src/services/peopleService.ts:32-49` (representative; pattern repeats in every `*Service.ts`)
**Root cause:** Callers pass `user.id` from the auth store, but if the session has silently rotated, the insert fails with a cryptic RLS error. There is no client-side guard.
**Suggested fix:** In each create wrapper, refetch `supabase.auth.getUser()` once and reject early with "Your session expired — please sign in" so the user gets a friendly toast instead of "new row violates row-level security policy for table".

---

### A8 — `useEffect` empty-deps with `eslint-disable` (stale-closure risk pattern)
**Severity:** LOW
**Feature:** Multiple pages — `TodayPage`, `ForecastPage`, `CommandPalette`, others
**File examples:** `src/features/today/TodayPage.tsx:23-28`, `src/features/health/ForecastPage.tsx:32-35`, `src/components/CommandPalette.tsx:34-41`, `src/components/FeatureTour.tsx:49-59`
**Root cause:** `// eslint-disable-next-line react-hooks/exhaustive-deps` muffles the linter where stable callbacks (Zustand actions) are used. Today, the store actions are stable references so behavior is fine, but the suppressed warnings make it easy for a future refactor to introduce a stale closure that captures a stale `loadDates` if the store ever switches to non-stable actions.
**Suggested fix:** Pass the actions through the dep array (they're already stable references by Zustand's contract) — no behavior change, lint becomes load-bearing again.

---

### A9 — `composeToday` re-uses the same `notification` `kind` in priority math but writes to multiple kinds in dedupe set
**Severity:** LOW
**Feature:** Today feed
**File:** `src/services/todayFeedService.ts:81-94, 153-156`
**Root cause:** `dedupe` keys on `id` only. Notifications get `notif:<uuid>`; date items get `date:<uuid>`; etc. — actually fine, no collisions. But `priority` for unread vs read notifications is `1 + (priority==='high' ? -0.5 : 0)` → an unread *normal* notification has priority `1`, which equals the read-high one (`1.5 - 0.5 = 1`), so the sort is unstable across renders, leading to occasional reorderings. Cosmetic.
**Suggested fix:** Tweak the formula or add a tiebreaker on `sent_at` desc so the order is stable.

---

### A10 — `EventsPage`/`EventDetailPage` `invited` filter is a no-op
**Severity:** LOW
**Feature:** Event detail
**File:** `src/features/events/EventDetailPage.tsx:87`
**Snippet:** `const invited = guests.filter((g) => !people.find((p) => p.id === g.person_id) ? false : true);`
**Root cause:** Logically equivalent to `guests.filter((g) => Boolean(people.find((p) => p.id === g.person_id)))` — fine, but if a guest exists in `event_guests` whose `person_id` was deleted (cascade may not be set up), they're silently hidden, then `unaddedPeople` re-shows them as "Add a guest" with an unmatched id. Today there's no `ON DELETE CASCADE` from people→event_guests confirmed in migration 0001, so this leaks silently.
**Suggested fix:** Either add the cascade in SQL, or treat the orphan rows visibly ("Removed person") instead of hiding.

---

### A11 — Avatar bucket vs memories bucket inconsistency
**Severity:** LOW
**Feature:** Photo upload (avatar vs memory)
**Files:** `src/services/avatarService.ts:14-44`, `src/services/memoriesService.ts:86-103`
**Root cause:** Avatar throws on any failure (good — deliberate UX). Memories silently swallows errors and saves text-only — but there is **no user-visible signal** that the photo is gone, just a `console.warn`. A user who attached a photo to a memory will believe it was saved.
**Suggested fix:** When `uploadMemoryPhoto` returns null, emit a toast "Saved without photo (upload failed)" via the toastStore so the user can retry/notice.

---

### A12 — `AddMemoryForm` doesn't expose `uploadMemoryPhoto` at all
**Severity:** MEDIUM (advertised feature unreachable)
**Feature:** Memory capture with photo
**File:** `src/features/memories/AddMemoryForm.tsx`
**Repro:** Open `/relationships/memories` → add memory. There is no `<input type="file">` in the form. `uploadMemoryPhoto` is implemented in the service but only `CaptureMomentModal` wires it up.
**Root cause:** Feature drift — the dedicated "Add memory" page lacks the photo affordance the modal has.
**Suggested fix:** Mirror the photo input from `CaptureMomentModal` into `AddMemoryForm`, or document the asymmetry deliberately.

---

### A13 — `EditPersonPage` cadence parsing accepts NaN before clamping
**Severity:** LOW
**File:** `src/features/people/EditPersonPage.tsx:108-120`
**Snippet:**
```ts
const cadenceParsed = cadence === '' ? null : Math.max(1, Math.min(365, parseInt(cadence, 10)));
...
cadence_days: cadenceParsed && !Number.isNaN(cadenceParsed) ? cadenceParsed : null,
```
**Root cause:** `parseInt('abc', 10)` returns `NaN`. `Math.min(365, NaN)` = `NaN`, `Math.max(1, NaN)` = `NaN`. The downstream `cadenceParsed && !isNaN(cadenceParsed)` correctly nullifies it, but if a user enters `0` it becomes truthy `1` after clamping (good) but the input is silently rewritten on next render (mildly surprising).
**Suggested fix:** `const n = parseInt(cadence, 10); cadenceParsed = Number.isFinite(n) ? Math.max(1, Math.min(365, n)) : null;`

---

### A14 — `OnboardingFlow.saveFirstBirthday` uses raw date string in label split
**Severity:** LOW
**File:** `src/features/onboarding/OnboardingFlow.tsx:74`
**Snippet:** `label: \`${name.split(' ')[0]}'s birthday\``
**Root cause:** If the user types `"Sarah O'Brien"`, the label becomes `Sarah's birthday` (correct). If they type `" Sarah"` with leading space, `split(' ')[0]` is `''` and the label becomes `'s birthday`. Form.full_name was trimmed when saving the person but `name` state is the raw value here.
**Suggested fix:** `const first = name.trim().split(/\s+/)[0] || 'Their'`.

---

### A15 — `Dashboard` onboarding gate runs after `useMemo` definitions in some paths
**Severity:** LOW (today the early-return prevents the hook order issue, but pattern is fragile)
**File:** `src/pages/Dashboard.tsx` (~lines 107-117 per scratchpad)
**Root cause:** Conditional hook patterns where an early return precedes any subsequent `useMemo` is allowed only because no later hook calls follow it. Refactors that add a hook after the conditional render would crash.
**Suggested fix:** Hoist all hooks above the gate, then branch in JSX.

---

### A16 — `aiCache.cachedAi` SELECT doesn't filter on `user_id`
**Severity:** LOW (RLS catches it)
**File:** `src/services/aiCache.ts:36-41`
**Root cause:** The lookup query filters only `(platform, cache_key)`. The unique index is `(user_id, platform, cache_key)`, so Supabase returns the row owned by `auth.uid()` thanks to RLS. If RLS is ever loosened, two users with the same fingerprint could read each other's results. Defense-in-depth is cheap here.
**Suggested fix:** Add `.eq('user_id', user.id)` to the SELECT.

---

### A17 — Composer "Sent ✓" state lost on tone change re-renders
**Severity:** LOW (the comment acknowledges it; verify intent)
**File:** `src/features/outreach/ComposerPage.tsx:67-68`
**Behavior:** Changing tone/occasion/channel intentionally clears `sentVariants`. That's fine — but the *previous* sent variant remains stored in `outreach_messages` so the user can verify in `RecentMessages`. The "Sent ✓" disappearing without explanation can confuse users who flip back to the previous tone expecting it to persist.
**Suggested fix:** Persist sent markers keyed on (variant body hash) rather than (index), so toggling back re-shows ✓.

---

### A18 — Couples `acceptLink(side)` trusts caller to pass the right side
**Severity:** MEDIUM
**File:** `src/services/couplesService.ts:33-46`
**Root cause:** Caller passes `side='a'|'b'`. There's no server check that the calling user is actually `user_a` (resp. `user_b`) of that link. RLS allows update by either member, and the bare-update pattern means user_b could call `acceptLink(linkId, 'a')` and stamp the *other* party's consent timestamp — looking like user_a accepted when they didn't.
**Suggested fix:** In the service, fetch the link first, infer side from `user.id`, and reject if not a member; or wrap as a SQL function `accept_link(link_id)` that uses `auth.uid()` server-side.

---

### A19 — `localAdvise` regex matches casually written questions inconsistently
**Severity:** LOW
**File:** `src/services/advisorService.ts:64-96`
**Root cause:** `/who.*reach.*out|who should i/.test(q)` requires both "who" and "reach" with "out" in order. Real questions like "anyone i should reach out to?" or "who's been quiet" don't match and fall through to the generic upcoming-dates branch. This is the local fallback when AI is down, so degraded but not broken.
**Suggested fix:** Broaden patterns or push everything through the AI even on slow networks (the cache already covers repeats).

---

### A20 — `notificationsService` (per scratchpad) — verify `setQuietHours` cross-app applies
**Severity:** LOW
**File:** `src/features/settings/NotificationPrefsPanel.tsx:90-106`
**Root cause:** `setQuietHours` is called once for the user; the panel then maps it onto every existing pref row. New rows the user creates later (push, email) won't have quiet hours unless `setQuietHours` is re-run. Today the only writer is this panel, so no live bug, but a future channel addition will silently bypass the user's quiet window.
**Suggested fix:** Make quiet-hours a single per-user row (not per-channel) and join at notification dispatch time.

---

## Phase 4 — Integration / data layer

### D1 — Edge function trusts client-supplied `cache_shared_key`
**Severity:** HIGH
**Feature:** Cross-user shared AI cache
**File:** `supabase/functions/aurzo-ai/index.ts:75-83, 480-516`
**Repro:** Malicious client posts `{ action: 'gift_ideas', cache_shared_key: <attacker-controlled hex>, ... }` with personalized PII in the prompt. Server writes the personalized result into `ai_cache_shared` keyed on the attacker-controlled hash. Any other user querying `gift_ideas` with the same intentional hash now reads attacker's data → **PII leakage across users**.
**Root cause:** The comment ("clients ask the server to record … sanitized") assumes the client honors the contract. There is no server-side recomputation of the cache key from the (sanitized) input, no cross-check, and no salting on `user_id`. The `ai_cache_shared` table is by design cross-user, so this is the entire boundary.
**Suggested fix:** Recompute the cache key server-side from a *server-built* sanitized fingerprint (only the fields you trust, never the names/notes). Reject the request if the client's `cache_shared_key` doesn't match what you'd compute. Better: drop `cache_shared_key` from the request shape entirely and have the server build it inline from `body.action + sanitizeParams(body)`.

---

### D2 — `.env.example` ships a real-looking Supabase URL + publishable key
**Severity:** MEDIUM
**File:** `.env.example:5-6, 8-9`
**Root cause:** The values look like the production project's URL and a `sb_publishable_…` key. Even though these are *publishable* (RLS-gated), shipping a known-good URL+key in source control invites credential confusion and trains contributors to commit such files. If the project ever rotates keys or wishes to revoke the existing publishable token, every clone of the repo carries the old one.
**Suggested fix:** Replace with placeholders (`https://your-project.supabase.co`, `<publishable-key>`) and add a `.env.local` to `.gitignore` (likely already there). If those *are* the in-use prod values, leave as-is but document it explicitly in `replit.md` so future devs know.

---

### D3 — `peopleService.deletePerson` + cascades not verified
**Severity:** MEDIUM
**Feature:** Delete person
**File:** `src/services/peopleService.ts:65-68`, schema in `supabase/migrations/0001_init.sql` (not yet read in detail)
**Risk:** Without `ON DELETE CASCADE` on `interactions.person_id`, `important_dates.person_id`, `gift_ideas.person_id`, `gifts_given.person_id`, `outreach_messages.person_id`, `event_guests.person_id`, and `memory_people.person_id`, deleting a person will either fail with a FK error or leave dangling rows (depending on FK config). UI doesn't surface FK errors well — a delete that "succeeds" but leaves orphans manifests as ghost cards in directories.
**Suggested fix:** Audit `0001_init.sql` for `on delete cascade` clauses; if missing, add a follow-up migration. Worth running a one-time integrity check against current data.

---

### D4 — `coreClient` schema vs `supabase.schema(...)` — confirm session propagation
**Severity:** LOW
**Files:** `src/services/aiCache.ts:36, 54, 139`, `src/services/couplesService.ts:5`
**Root cause:** `supabase.schema('aurzo_core')` and `supabase.schema('shared_data')` reuse the parent client (and thus the parent session). Per the JS-SDK docs this is supported in v2, but if the helper ever instantiates a fresh client without the access token, RLS will reject every read. Today this works — flag for future-proofing.

---

### D5 — Migrations include `0008_cron_pulse.sql` and `0009_nudges.sql` — pg_cron + service role assumed
**Severity:** LOW
**Risk:** Production needs `pg_cron` enabled and the service-role secret set inside the project. The edge function `aurzo-ai` does check for `SUPABASE_SERVICE_ROLE_KEY` and rejects mismatches (`index.ts:88-92`) — good. Worth adding an operational doc reminder.

---

### D6 — `events.budget` shown with `toFixed(0)` but stored as numeric
**Severity:** LOW
**File:** `src/features/events/EventDetailPage.tsx:99`
**Root cause:** `ev.budget.toFixed(0)` only works if `budget` came back as a JS `number`. Supabase returns `numeric` columns as **strings** in some configs to preserve precision. If that ever flips, `.toFixed` will throw.
**Suggested fix:** `Number(ev.budget).toFixed(0)` defensively.

---

### D7 — `commandPalette` data is loaded only on first open
**Severity:** LOW
**File:** `src/components/CommandPalette.tsx:34-41`
**Root cause:** `useEffect` keyed on `[open]` (with eslint-disable). On first open, `loadPeople`/`loadDates` run only if the store is empty. After delete-all-people in the directory, the palette still shows stale results until the user hard-reloads.
**Suggested fix:** Subscribe to store mutations or always trigger `loadPeople()` on open (Zustand actions are cheap).

---

## Phase 5 — Cross-cutting concerns

### C1 — Accessibility — `ConfirmModal` lacks focus trap
**Severity:** LOW
**File:** `src/components/ConfirmModal.tsx:31-42`
**Root cause:** The component focuses the confirm button on open but doesn't trap Tab. A keyboard user pressing Tab beyond the cancel button escapes back into the dimmed background controls, which is confusing for AT users. The comment ("Tab order already loops between confirm + cancel naturally") is incorrect — focus moves to the next focusable element behind the modal.
**Suggested fix:** Add a tiny `useFocusTrap` hook (sentinel divs at start/end with `onFocus={() => confirmRef.current?.focus()}`).

---

### C2 — Accessibility — `CommandPalette` not announced as listbox/combobox
**Severity:** MEDIUM
**File:** `src/components/CommandPalette.tsx:110-198`
**Root cause:** The palette uses `role="dialog"` on the container and a plain `<input>` + `<ul>` of buttons. AT users get a dialog open + a plain text field + a button list — no announcement of "X results", no current-option callout. Standard pattern is `role="combobox" aria-expanded aria-controls="listbox-id"` on the input and `role="listbox"` + `role="option" aria-selected` on items.
**Suggested fix:** Convert to the WAI-ARIA combobox-listbox pattern; pipe `cursor` into `aria-activedescendant` so screen readers announce the highlighted item as the user arrows.

---

### C3 — Mobile — `MobileShell` not yet inspected, but `OfflineBanner` overlays content
**Severity:** LOW
**File:** `src/components/OfflineBanner.tsx:27-38`
**Root cause:** `fixed top-0 inset-x-0 z-[80]` overlays the page header. Pages with a fixed top nav stack the banner *over* the nav; pages without it push down content. There's no top padding compensation on the body when the banner appears, so titles get hidden on offline.
**Suggested fix:** Reserve top space dynamically (root layout reads an "offline" signal and adds `pt-[banner-height]` when offline).

---

### C4 — Performance — `composeToday` re-runs every render of `TodayPage` because `notifications` is a new array reference each load
**Severity:** LOW
**File:** `src/features/today/TodayPage.tsx:30-33`
**Root cause:** `useNotificationsStore((s) => s.items)` returns a new reference whenever the realtime subscription pushes anything (even unrelated events). `useMemo` deps include `notifications`, so `composeToday` recomputes. Today this is fine (small lists), but with hundreds of items the per-render `forecastAll`/`composeToday` allocate a lot.
**Suggested fix:** Memoize at the store boundary with `shallow` equality or split the store into seldom-changing slices.

---

### C5 — Security — Public storage URLs for `user-avatars` and `memories`
**Severity:** MEDIUM
**Files:** `src/services/avatarService.ts:38-41`, `src/services/memoriesService.ts:97-99`
**Root cause:** `getPublicUrl` returns a URL that anyone with the link can fetch (no auth header). For avatars, if the bucket is public, **every photo URL is enumerable by anyone who knows `{ownerId}/{personId}-{timestamp}.ext`**. Path is mostly opaque (UUIDs), but timestamps narrow guesses. Memories have higher PII risk (private moments).
**Suggested fix:** Use signed URLs (`createSignedUrl(path, ttlSeconds)`) generated on read, *or* keep public buckets but commit to UUID-only paths and document the privacy posture in `replit.md`. For memories, signed URLs are the right call.

---

### C6 — Security — `ANTHROPIC_API_KEY` rotation needs documentation
**Severity:** LOW
**Root cause:** Only the edge function has the key. Good. Worth documenting that the key must be set as a Supabase project secret (`supabase secrets set ANTHROPIC_API_KEY=…`) and never as a `VITE_*` variable.

---

### C7 — Performance — image uploads aren't downscaled or transcoded
**Severity:** LOW
**Files:** `avatarService.ts`, `memoriesService.ts`
**Root cause:** Original-resolution iPhone photo (~5 MB) is sent as-is. Avatar tiles are rendered at 96px. Bandwidth and storage waste compounds across users.
**Suggested fix:** Client-side downscale via `<canvas>` to e.g. 800px max-edge and re-encode to WebP before upload.

---

### C8 — A11y — `KindStripe` and color-only encodings
**Severity:** LOW
**Files:** `src/features/today/TodayPage.tsx:133-141`, `src/features/health/SuggestionsPanel.tsx:7-19`
**Root cause:** Color is the sole signifier of "kind" (date_today vs date_soon vs fading). Color-blind users don't get an alternative cue (the text already conveys kind, but the stripe is purely decorative — fine, just confirm the icon column is sufficient).
**Suggested fix:** Add `aria-label` or `title` to the stripe (but it's already `aria-hidden`, which is correct since the row text covers it). No-op confirmed for current code; worth re-checking for any future variant rows that *only* use color.

---

### C9 — A11y — `OnboardingFlow` `<input autoFocus>` jumps focus on render
**Severity:** LOW
**File:** `src/features/onboarding/OnboardingFlow.tsx:112`
**Root cause:** `autoFocus` on a deeply-nested input causes the page to scroll on mount — unpleasant on mobile when the keyboard pops immediately. Standard React advice is to focus imperatively after layout settles.

---

### C10 — Mobile — `CommandPalette` opens at `pt-24` on small screens
**Severity:** LOW
**File:** `src/components/CommandPalette.tsx:111-114`
**Root cause:** `sm:pt-24` only kicks in at ≥640px; on mobile the palette anchors to the very top with `p-4`. Combined with the keyboard rising up, the input can be covered.
**Suggested fix:** Use `pt-[max(1rem,env(safe-area-inset-top))]` and `pb-[env(keyboard-inset-height)]` (where supported) or visualViewport listeners.

---

### C11 — `ProfileSections.LifeContextSection` reads `ctx.kids` etc. without typing guard
**Severity:** LOW
**File:** `src/features/people/profile/ProfileSections.tsx:51-56`
**Root cause:** `person.life_context` is `Record<string, unknown> | null` but the component coerces to plain string via `[k, v]` tuples. If life_context ever stores a number/object/null for `ctx.job` (it can — it's `unknown`), the component renders `[object Object]`.
**Suggested fix:** Coerce with `String(v)` or a runtime `typeof v === 'string'` guard.

---

### C12 — `RootErrorBoundary` re-uses `details open={import.meta.env.DEV}` — fine, but stack traces leak in prod open-by-default if env mis-set
**Severity:** LOW
**File:** `src/components/RootErrorBoundary.tsx:78-93`
**Root cause:** If a bad build sets `DEV=true` in production, raw stacks appear under a "Technical details" disclosure. Worth verifying the production env always sets `MODE=production`.

---

## Quick wins (recommended order if you greenlight fixes)

1. **D1 (HIGH)** — Recompute `cache_shared_key` server-side before any `ai_cache_shared` write. Closes a cross-user PII leak.
2. **A1 (HIGH)** — Switch `callJson` to Anthropic tool-use binding so JSON responses actually parse.
3. **A12 (MEDIUM)** — Add the missing photo input to `AddMemoryForm`.
4. **A2 (MEDIUM)** — Fix the `do_not_nudge_until` timezone drift.
5. **A3 / A18 (MEDIUM)** — Tighten `couplesService` (single-row contract + server-side side inference).
6. **D3 (MEDIUM)** — Audit FK cascades for `people.delete`.
7. **C5 (MEDIUM)** — Move memories (and ideally avatars) to signed URLs.
8. **C2 (MEDIUM)** — Convert `CommandPalette` to combobox-listbox semantics.
9. **A4 (MEDIUM)** — Allow-list CORS origins on the edge function.
10. The remaining **LOW** items are good polish for a follow-up sweep.

---

## Strengths worth preserving

- Strict client/server split for AI calls; the API key never reaches the browser.
- Per-user RLS on every owner-scoped table is uniform and clean (`0002_rls.sql`).
- The two-tier cache (`cachedAi` per-user + `cachedAiShared` cross-user) is a thoughtful cost optimization — once D1 is closed, it's a real differentiator.
- `RootErrorBoundary` preserves the warm shell instead of dumping a white screen.
- `OfflineBanner` re-checks on focus to catch iOS Safari's missed events — small but right.
- `useGlobalHotkeys` properly guards against typing-in-input, so ⌘K doesn't hijack inputs.
- Pure derivation functions (`forecastService`, `balanceService`, `todayFeedService`, `interactionsService.computeStrength`) keep the heavy logic unit-testable.
- Writeups in code comments are unusually thorough — they read like spec snippets and help an auditor confirm intent vs. implementation drift.

---

*End of audit. Audit-only run; no code was modified.*
