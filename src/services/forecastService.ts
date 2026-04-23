// Relationship health forecast — pure projections from existing data.
//
// For each person we return:
//   • currentStrength   — today's bucket (from computeStrength)
//   • daysSinceContact  — integer or null
//   • daysUntilDormant  — non-negative integer; 0 means "already dormant"
//   • projectedDormantOn — ISO date when they'll cross into dormant if no
//                         interaction happens (null if already dormant)
//   • currentStreakDays — consecutive days ending today with ≥1 interaction
//   • longestStreak30   — longest recent streak in the last 30 days
//
// Nothing here hits the network; it's all derived from the slices already
// loaded into the peopleStore + interactionsStore.

import type { Interaction } from '@/types/interactions';
import type { Person, Strength } from '@/types/people';
import { computeStrength } from './interactionsService';

export type PersonForecast = {
  person: Person;
  currentStrength: Strength;
  daysSinceContact: number | null;
  daysUntilDormant: number;
  projectedDormantOn: string | null;
  currentStreakDays: number;
  longestStreak30: number;
};

export function forecastPerson(
  person: Person,
  interactions: Interaction[],
  now: Date = new Date(),
): PersonForecast {
  const strength = computeStrength(person, interactions);
  const fadeAt = person.fading_threshold_days ?? 30;
  const dormantAt = fadeAt * 3;

  const lastIso = mostRecent(interactions, person.id) ?? person.last_contacted_at;
  const daysSince = lastIso ? daysBetween(new Date(lastIso), now) : null;

  const untilDormant = daysSince === null
    ? dormantAt
    : Math.max(0, dormantAt - daysSince);

  const projectedDormantOn = untilDormant > 0
    ? addDays(now, untilDormant).toISOString().slice(0, 10)
    : null;

  const personIx = interactions
    .filter((i) => i.person_id === person.id)
    .map((i) => startOfDayMs(new Date(i.occurred_at)));

  const currentStreak = computeCurrentStreak(personIx, now);
  const longest = computeLongestStreak(personIx, 30, now);

  return {
    person,
    currentStrength: strength,
    daysSinceContact: daysSince,
    daysUntilDormant: untilDormant,
    projectedDormantOn,
    currentStreakDays: currentStreak,
    longestStreak30: longest,
  };
}

export function forecastAll(
  people: Person[],
  interactions: Interaction[],
  now?: Date,
): PersonForecast[] {
  return people.map((p) => forecastPerson(p, interactions, now));
}

function mostRecent(interactions: Interaction[], personId: string): string | null {
  let best: string | null = null;
  for (const i of interactions) {
    if (i.person_id !== personId) continue;
    if (best === null || i.occurred_at > best) best = i.occurred_at;
  }
  return best;
}

function computeCurrentStreak(interactionDays: number[], now: Date): number {
  if (interactionDays.length === 0) return 0;
  const set = new Set(interactionDays);
  let streak = 0;
  const todayMs = startOfDayMs(now);
  for (let i = 0; i < 400; i++) {
    const day = todayMs - i * 86400_000;
    if (set.has(day)) streak++;
    else if (i === 0) continue; // allow skipping today (streak can end yesterday)
    else break;
  }
  return streak;
}

function computeLongestStreak(interactionDays: number[], windowDays: number, now: Date): number {
  if (interactionDays.length === 0) return 0;
  const cutoff = startOfDayMs(now) - windowDays * 86400_000;
  const set = new Set(interactionDays.filter((d) => d >= cutoff));
  if (set.size === 0) return 0;
  let longest = 0;
  for (const d of set) {
    if (set.has(d - 86400_000)) continue; // not a streak start
    let len = 1;
    while (set.has(d + len * 86400_000)) len++;
    if (len > longest) longest = len;
  }
  return longest;
}

function startOfDayMs(d: Date): number {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}
function daysBetween(earlier: Date, later: Date): number {
  return Math.floor((startOfDayMs(later) - startOfDayMs(earlier)) / 86400_000);
}
function addDays(d: Date, n: number): Date {
  const x = new Date(d); x.setDate(x.getDate() + n); return x;
}

export function urgencyOf(f: PersonForecast): number {
  // Higher = more urgent. Dormant > fading-soon > fading > healthy.
  if (f.currentStrength === 'dormant') return 100;
  if (f.daysUntilDormant <= 7)  return 80;
  if (f.daysUntilDormant <= 21) return 60;
  if (f.currentStrength === 'fading') return 50;
  return 10;
}

export const STRENGTH_COLOR: Record<Strength, string> = {
  thriving: '#9a7838',  // gold-700
  active:   '#c9a15b',  // gold-500
  fading:   '#e0a48a',  // terracotta-300
  dormant:  '#8a7d72',  // charcoal-300
  unknown:  '#f3e9d2',  // cream-200
};
