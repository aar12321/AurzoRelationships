// Command palette search — turns the current app state into a unified,
// searchable list of commands. Pure functions: given stores + a query
// string, return ranked result groups. No React, no side effects.
//
// Sources (in priority order when query is empty):
//   • Quick actions  — "Add person", "Compose message", "Log memory", etc.
//   • People         — by full_name, relationship_type
//   • Pages          — every top-level route
//   • Upcoming dates — next 30 days, formatted "Alex · birthday in 5d"
//
// Ranking: substring match wins; prefix match wins harder; word-boundary
// match wins hardest. Fuzzy gap tolerance is two characters.

import type { Person } from '@/types/people';
import type { ImportantDate } from '@/types/dates';

export type CommandKind = 'action' | 'person' | 'page' | 'date';

export type CommandItem = {
  id: string;
  kind: CommandKind;
  label: string;
  hint?: string;
  to?: string;                       // navigate target
  run?: () => void;                  // imperative action (e.g. open advisor)
  keywords?: string[];               // extra search terms
};

export type CommandGroup = { kind: CommandKind; title: string; items: CommandItem[] };

const PAGES: { to: string; label: string; keywords?: string[] }[] = [
  { to: '/relationships',          label: 'Home',        keywords: ['dashboard', 'pulse'] },
  { to: '/relationships/people',   label: 'People',      keywords: ['directory', 'contacts'] },
  { to: '/relationships/dates',    label: 'Dates',       keywords: ['birthday', 'anniversary'] },
  { to: '/relationships/health',   label: 'Health',      keywords: ['strength', 'reach out'] },
  { to: '/relationships/events',   label: 'Events',      keywords: ['gatherings'] },
  { to: '/relationships/gifts',    label: 'Gifts',       keywords: ['ideas'] },
  { to: '/relationships/memories', label: 'Memories',    keywords: ['journal', 'log'] },
  { to: '/relationships/couples',  label: 'Couples',     keywords: ['partner'] },
  { to: '/relationships/advisor',  label: 'Advisor',     keywords: ['ai', 'chat', 'ask'] },
  { to: '/relationships/settings', label: 'Settings',    keywords: ['theme', 'dark', 'profile'] },
];

export function buildCommands(args: {
  people: Person[];
  dates: ImportantDate[];
  actions: CommandItem[];
  activePersonId?: string | null;
}): CommandItem[] {
  const { people, dates, actions, activePersonId } = args;

  const personItems: CommandItem[] = people.map((p) => ({
    id: `person:${p.id}`,
    kind: 'person',
    label: p.full_name,
    hint: p.relationship_type ?? undefined,
    to: `/relationships/people/${p.id}`,
    keywords: [p.relationship_type ?? '', p.id === activePersonId ? 'active' : ''],
  }));

  const pageItems: CommandItem[] = PAGES.map((p) => ({
    id: `page:${p.to}`,
    kind: 'page',
    label: p.label,
    hint: p.to,
    to: p.to,
    keywords: p.keywords,
  }));

  const dateItems: CommandItem[] = upcomingDates(dates, 30).map((d) => ({
    id: `date:${d.id}`,
    kind: 'date',
    label: d.label,
    hint: d.hint,
    to: d.to,
    keywords: [d.label],
  }));

  return [...actions, ...personItems, ...pageItems, ...dateItems];
}

function upcomingDates(dates: ImportantDate[], horizonDays: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return dates
    .map((d) => {
      const [y, mo, da] = d.event_date.split('-').map(Number);
      const candidate = new Date(d.recurring ? today.getFullYear() : y, mo - 1, da);
      if (d.recurring && candidate < today) candidate.setFullYear(today.getFullYear() + 1);
      const days = Math.round((candidate.getTime() - today.getTime()) / 86400_000);
      return { d, days, candidate };
    })
    .filter(({ days }) => days >= 0 && days <= horizonDays)
    .sort((a, b) => a.days - b.days)
    .map(({ d, days }) => ({
      id: d.id,
      label: `${d.label}`,
      hint: days === 0 ? 'today' : `in ${days}d`,
      to: d.person_id ? `/relationships/people/${d.person_id}` : '/relationships/dates',
    }));
}

export function rank(items: CommandItem[], query: string): CommandItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  const scored = items
    .map((it) => ({ it, s: score(it, q) }))
    .filter(({ s }) => s > 0)
    .sort((a, b) => b.s - a.s);
  return scored.map(({ it }) => it);
}

function score(it: CommandItem, q: string): number {
  const hay = [it.label, it.hint ?? '', ...(it.keywords ?? [])].join(' ').toLowerCase();
  const label = it.label.toLowerCase();
  if (label === q) return 1000;
  if (label.startsWith(q)) return 500 + (100 - Math.min(100, label.length));
  const wb = new RegExp(`\\b${escapeRegex(q)}`).test(hay);
  if (wb) return 200;
  if (hay.includes(q)) return 100;
  return fuzzyScore(hay, q);
}

function fuzzyScore(hay: string, needle: string): number {
  let hi = 0, ni = 0, hits = 0, gap = 0;
  while (hi < hay.length && ni < needle.length) {
    if (hay[hi] === needle[ni]) { hits++; ni++; gap = 0; }
    else gap++;
    if (gap > 2) return 0;
    hi++;
  }
  return ni === needle.length ? 40 + hits : 0;
}

function escapeRegex(s: string): string { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

export function groupResults(items: CommandItem[]): CommandGroup[] {
  const titles: Record<CommandKind, string> = {
    action: 'Actions', person: 'People', page: 'Pages', date: 'Upcoming',
  };
  const order: CommandKind[] = ['action', 'person', 'date', 'page'];
  const groups = new Map<CommandKind, CommandItem[]>();
  for (const it of items) {
    const arr = groups.get(it.kind) ?? [];
    arr.push(it);
    groups.set(it.kind, arr);
  }
  return order
    .filter((k) => (groups.get(k)?.length ?? 0) > 0)
    .map((k) => ({ kind: k, title: titles[k], items: (groups.get(k) ?? []).slice(0, 8) }));
}
