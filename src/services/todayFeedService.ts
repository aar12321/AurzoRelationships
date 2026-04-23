// Today feed composer — merges several signals into a single, priority-ordered
// timeline of "moments that matter today." Pure functions; given stores, it
// returns a sorted list of TodayItem.
//
// Sources (priority):
//   0  — happening today (birthdays/anniversaries that are literally today)
//   1  — unread notifications
//   2  — dates in the next 7 days
//   3  — close people going dormant (silent past their fading threshold)
//   4  — active streaks worth celebrating (30+ days, recurring contact)

import type { ImportantDate } from '@/types/dates';
import type { Interaction } from '@/types/interactions';
import type { Person, Strength } from '@/types/people';
import type { Notification } from '@/types/core';
import { computeStrength } from './interactionsService';

export type TodayKind =
  | 'date_today' | 'notification' | 'date_soon' | 'fading' | 'streak';

export type TodayItem = {
  id: string;
  kind: TodayKind;
  priority: number;
  icon: string;
  title: string;
  body: string;
  hint?: string;
  to?: string;
  timestamp?: string;
};

const CLOSE = new Set<string>(['partner', 'spouse', 'family', 'close_friend']);

export function composeToday(args: {
  people: Person[];
  dates: ImportantDate[];
  interactions: Interaction[];
  notifications: Notification[];
  now?: Date;
}): TodayItem[] {
  const now = args.now ?? new Date();
  const today = startOfDay(now);
  const items: TodayItem[] = [];

  items.push(...datesToItems(args.dates, args.people, today));
  items.push(...notificationsToItems(args.notifications, 10));
  items.push(...fadingToItems(args.people, args.interactions));
  items.push(...streakItems(args.people, args.interactions, today));

  return dedupe(items).sort((a, b) => a.priority - b.priority);
}

function datesToItems(dates: ImportantDate[], people: Person[], today: Date): TodayItem[] {
  const nameOf = new Map(people.map((p) => [p.id, p.full_name] as const));
  const out: TodayItem[] = [];
  for (const d of dates) {
    const [y, mo, da] = d.event_date.split('-').map(Number);
    const occurs = new Date(d.recurring ? today.getFullYear() : y, mo - 1, da);
    if (d.recurring && occurs < today) occurs.setFullYear(today.getFullYear() + 1);
    const days = Math.round((occurs.getTime() - today.getTime()) / 86400_000);
    if (days < 0 || days > 7) continue;

    const personName = d.person_id ? nameOf.get(d.person_id) : null;
    const isToday = days === 0;
    out.push({
      id: `date:${d.id}`,
      kind: isToday ? 'date_today' : 'date_soon',
      priority: isToday ? 0 : 2 + days / 10,
      icon: d.date_type === 'birthday' ? '🎂' : d.date_type === 'anniversary' ? '💞' : '📅',
      title: personName ? `${personName} — ${d.label}` : d.label,
      body: isToday ? "It's today." : `In ${days} day${days === 1 ? '' : 's'}.`,
      hint: d.date_type,
      to: d.person_id ? `/relationships/people/${d.person_id}` : '/relationships/dates',
      timestamp: isToday ? 'today' : `in ${days}d`,
    });
  }
  return out;
}

function notificationsToItems(notifs: Notification[], limit: number): TodayItem[] {
  return notifs
    .slice(0, limit)
    .map((n) => ({
      id: `notif:${n.id}`,
      kind: 'notification',
      priority: n.read_at ? 1.5 : 1 + (n.priority === 'high' ? -0.5 : 0),
      icon: iconForCategory(n.category),
      title: n.title,
      body: n.body ?? '',
      to: n.action_url && n.action_url.startsWith('/') ? n.action_url : undefined,
      timestamp: relativeTime(n.sent_at),
    }));
}

function fadingToItems(people: Person[], interactions: Interaction[]): TodayItem[] {
  const out: TodayItem[] = [];
  for (const p of people) {
    if (!CLOSE.has(p.relationship_type ?? '')) continue;
    const s: Strength = computeStrength(p, interactions);
    if (s !== 'fading' && s !== 'dormant') continue;
    const lastIso = p.last_contacted_at;
    const days = lastIso
      ? Math.round((Date.now() - new Date(lastIso).getTime()) / 86400_000)
      : null;
    out.push({
      id: `fading:${p.id}`,
      kind: 'fading',
      priority: s === 'dormant' ? 3 : 3.5,
      icon: '🌿',
      title: `${p.full_name} — a gentle heads-up`,
      body: days === null
        ? "You haven't logged any contact yet."
        : `${days} days since your last interaction.`,
      hint: p.relationship_type ?? undefined,
      to: `/relationships/people/${p.id}`,
    });
  }
  return out;
}

function streakItems(people: Person[], interactions: Interaction[], today: Date): TodayItem[] {
  // A "streak" = 3+ interactions with the same person in the last 30 days.
  // Kept intentionally simple; the Health page is where full streaks live.
  const byPerson = new Map<string, Interaction[]>();
  const thirty = today.getTime() - 30 * 86400_000;
  for (const ix of interactions) {
    const t = new Date(ix.occurred_at).getTime();
    if (t < thirty) continue;
    const arr = byPerson.get(ix.person_id) ?? [];
    arr.push(ix);
    byPerson.set(ix.person_id, arr);
  }
  const nameOf = new Map(people.map((p) => [p.id, p.full_name] as const));
  const out: TodayItem[] = [];
  byPerson.forEach((arr, pid) => {
    if (arr.length < 3) return;
    const name = nameOf.get(pid);
    if (!name) return;
    out.push({
      id: `streak:${pid}`,
      kind: 'streak',
      priority: 4,
      icon: '✨',
      title: `A good rhythm with ${name}`,
      body: `${arr.length} interactions in the last 30 days.`,
      to: `/relationships/people/${pid}`,
    });
  });
  return out;
}

function dedupe(items: TodayItem[]): TodayItem[] {
  const seen = new Set<string>();
  return items.filter((i) => (seen.has(i.id) ? false : (seen.add(i.id), true)));
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function iconForCategory(cat: string | null): string {
  switch (cat) {
    case 'weekly_pulse': return '🌅';
    case 'nudge':        return '🔔';
    case 'reminder':     return '⏰';
    case 'couples':      return '💞';
    default:             return '📬';
  }
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
