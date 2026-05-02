// Relationship balance — pure aggregations over peopleStore + interactionsStore.
//
// What this answers:
//   • Which relationship-type groups are you over-indexing on / neglecting?
//   • Whose typical cadence has drifted recently (talked monthly, now silent for 60+ days)?
//   • What's the single next gentle action we'd suggest right now?
//
// All inputs are slices already in memory — no network. Keep this file pure
// so it can be unit-tested without mocks.

import type { Interaction } from '@/types/interactions';
import type { Person, RelationshipType } from '@/types/people';
import { RELATIONSHIP_TYPE_LABELS } from '@/types/people';

const DAY = 86_400_000;

export type GroupBalance = {
  type: RelationshipType | 'unsorted';
  label: string;
  count: number;
  avgDaysSinceContact: number | null;
  fadingOrDormant: number;
  recentInteractions30d: number;
  share: number; // fraction of total recent interactions, 0..1
};

export type CadenceDrift = {
  person: Person;
  typicalCadenceDays: number;
  currentGapDays: number;
  driftRatio: number; // currentGap / typicalCadence
};

export type Suggestion = {
  id: string;
  kind: 'reach_out' | 'rebalance' | 'celebrate' | 'rest';
  personId: string | null;
  text: string;
  weight: number; // higher = more prominent
};

export function groupBalance(
  people: Person[],
  interactions: Interaction[],
  now: Date = new Date(),
): GroupBalance[] {
  const cutoff = now.getTime() - 30 * DAY;
  const totalRecent = interactions.filter(
    (i) => new Date(i.occurred_at).getTime() >= cutoff,
  ).length;

  const groups = new Map<string, Person[]>();
  for (const p of people) {
    const key = p.relationship_type ?? 'unsorted';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(p);
  }

  const out: GroupBalance[] = [];
  for (const [key, members] of groups) {
    const ids = new Set(members.map((m) => m.id));
    const recent = interactions.filter(
      (i) => ids.has(i.person_id) && new Date(i.occurred_at).getTime() >= cutoff,
    );
    const days: number[] = [];
    let fadingOrDormant = 0;
    for (const p of members) {
      if (!p.last_contacted_at) { fadingOrDormant++; continue; }
      const d = (now.getTime() - new Date(p.last_contacted_at).getTime()) / DAY;
      days.push(d);
      const fadeAt = p.fading_threshold_days ?? 30;
      if (d > fadeAt) fadingOrDormant++;
    }
    out.push({
      type: key as GroupBalance['type'],
      label: key === 'unsorted' ? 'Unsorted' : RELATIONSHIP_TYPE_LABELS[key as RelationshipType],
      count: members.length,
      avgDaysSinceContact: days.length ? days.reduce((s, x) => s + x, 0) / days.length : null,
      fadingOrDormant,
      recentInteractions30d: recent.length,
      share: totalRecent > 0 ? recent.length / totalRecent : 0,
    });
  }
  return out.sort((a, b) => b.count - a.count);
}

export function cadenceDrift(
  people: Person[],
  interactions: Interaction[],
  now: Date = new Date(),
): CadenceDrift[] {
  const out: CadenceDrift[] = [];
  for (const p of people) {
    const ix = interactions
      .filter((i) => i.person_id === p.id)
      .map((i) => new Date(i.occurred_at).getTime())
      .sort((a, b) => a - b);
    if (ix.length < 3) continue; // need history to know "typical"

    // typical cadence = user-set cadence_days when provided, else median gap
    // between consecutive logged interactions.
    let typical: number;
    if (p.cadence_days && p.cadence_days >= 1) {
      typical = p.cadence_days;
    } else {
      const gaps: number[] = [];
      for (let k = 1; k < ix.length; k++) gaps.push((ix[k] - ix[k - 1]) / DAY);
      typical = median(gaps);
    }
    if (typical < 1) continue;

    const currentGap = (now.getTime() - ix[ix.length - 1]) / DAY;
    const ratio = currentGap / typical;
    if (ratio < 1.75) continue; // not drifted yet
    out.push({
      person: p,
      typicalCadenceDays: Math.round(typical),
      currentGapDays: Math.round(currentGap),
      driftRatio: ratio,
    });
  }
  return out.sort((a, b) => b.driftRatio - a.driftRatio);
}

export function buildSuggestions(
  people: Person[],
  interactions: Interaction[],
  now: Date = new Date(),
): Suggestion[] {
  const out: Suggestion[] = [];
  const groups = groupBalance(people, interactions, now);
  const drifts = cadenceDrift(people, interactions, now).slice(0, 3);

  // 1. Top drift — most actionable
  for (const d of drifts) {
    out.push({
      id: `drift:${d.person.id}`,
      kind: 'reach_out',
      personId: d.person.id,
      text: `You usually catch up with ${d.person.full_name} every ~${d.typicalCadenceDays} days. It's been ${d.currentGapDays}.`,
      weight: 90 + Math.min(10, d.driftRatio),
    });
  }

  // 2. Group rebalance — only flag groups with ≥3 people
  const eligible = groups.filter((g) => g.count >= 3);
  if (eligible.length >= 2) {
    const sortedByShare = [...eligible].sort((a, b) => b.share - a.share);
    const heavy = sortedByShare[0];
    const light = sortedByShare[sortedByShare.length - 1];
    if (heavy.share - light.share > 0.4) {
      out.push({
        id: `balance:${light.type}`,
        kind: 'rebalance',
        personId: null,
        text: `You've been heavy on ${heavy.label.toLowerCase()} and light on ${light.label.toLowerCase()} this month.`,
        weight: 60,
      });
    }
  }

  // 3. Celebrate — someone with a fresh recent meaningful interaction
  const fresh = interactions
    .filter((i) => (now.getTime() - new Date(i.occurred_at).getTime()) / DAY <= 2 && i.quality === 'deep')
    .slice(0, 1);
  for (const f of fresh) {
    const p = people.find((x) => x.id === f.person_id);
    if (p) out.push({
      id: `celebrate:${f.id}`,
      kind: 'celebrate',
      personId: p.id,
      text: `Nice — that deep catch-up with ${p.full_name} counts.`,
      weight: 30,
    });
  }

  return out.sort((a, b) => b.weight - a.weight);
}

function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
