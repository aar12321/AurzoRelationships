// Relationship map layout — pure math. Given people + strengths, returns
// { nodes, rings } positioned on a cartesian plane centered at (0,0). The
// viewer page renders these with SVG.
//
// Layout: concentric rings by relationship_type, closeness-ordered. Within
// each ring, nodes are distributed evenly by angle. Node radius reflects
// relationship strength (thriving → dormant).

import type { Person, RelationshipType, Strength } from '@/types/people';

export type MapNode = {
  id: string;
  name: string;
  type: RelationshipType | null;
  strength: Strength;
  x: number;
  y: number;
  r: number;
  ringIndex: number;
};

export type MapRing = { type: RelationshipType | 'other'; label: string; radius: number };

const RING_ORDER: (RelationshipType | 'other')[] = [
  'partner', 'family', 'close_friend', 'mentor',
  'colleague', 'reconnecting', 'acquaintance', 'other',
];

const RING_LABELS: Record<RelationshipType | 'other', string> = {
  partner:      'Partner',
  family:       'Family',
  close_friend: 'Close',
  mentor:       'Mentor',
  colleague:    'Colleague',
  reconnecting: 'Reconnecting',
  acquaintance: 'Acquaintance',
  other:        'Other',
};

const RING_RADII = [70, 120, 170, 210, 250, 290, 340, 380];

const NODE_R: Record<Strength, number> = {
  thriving: 13, active: 11, fading: 9, dormant: 7, unknown: 9,
};

export const TYPE_COLORS: Record<RelationshipType | 'other', string> = {
  partner:      '#8f4c2f', // terracotta-700
  family:       '#9a7838', // gold-700
  close_friend: '#c67a5b', // terracotta-500
  mentor:       '#c9a15b', // gold-500
  colleague:    '#5a4f46', // charcoal-500
  reconnecting: '#e0a48a', // terracotta-300
  acquaintance: '#8a7d72', // charcoal-300
  other:        '#8a7d72',
};

export function layoutMap(
  people: { id: string; full_name: string; relationship_type: RelationshipType | null }[],
  strengthOf: (personId: string) => Strength,
): { nodes: MapNode[]; rings: MapRing[] } {
  const buckets = new Map<RelationshipType | 'other', typeof people>();
  for (const p of people) {
    const key = (p.relationship_type ?? 'other') as RelationshipType | 'other';
    const arr = buckets.get(key) ?? [];
    arr.push(p);
    buckets.set(key, arr);
  }

  const nodes: MapNode[] = [];
  const rings: MapRing[] = [];

  RING_ORDER.forEach((type, idx) => {
    const arr = buckets.get(type);
    if (!arr || arr.length === 0) return;
    const radius = RING_RADII[idx];
    rings.push({ type, label: RING_LABELS[type], radius });

    // Distribute evenly, starting from -90° (north) so the first node sits
    // at the top for a calm, symmetric feel.
    arr.forEach((p, i) => {
      const angle = (-Math.PI / 2) + (2 * Math.PI * i) / arr.length;
      const s = strengthOf(p.id);
      nodes.push({
        id: p.id,
        name: p.full_name,
        type: p.relationship_type,
        strength: s,
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        r: NODE_R[s],
        ringIndex: idx,
      });
    });
  });

  return { nodes, rings };
}

export function strengthOpacity(s: Strength): number {
  switch (s) {
    case 'thriving': return 1;
    case 'active':   return 0.85;
    case 'fading':   return 0.55;
    case 'dormant':  return 0.3;
    default:         return 0.6;
  }
}

// Helper for the legend: produce the list of types actually in use, preserving
// the closeness order so the legend reads top-to-bottom from close to distant.
export function legendTypes(people: Person[]): (RelationshipType | 'other')[] {
  const set = new Set<RelationshipType | 'other'>();
  for (const p of people) set.add((p.relationship_type ?? 'other') as RelationshipType | 'other');
  return RING_ORDER.filter((t) => set.has(t));
}
