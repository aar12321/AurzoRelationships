import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import {
  groupBalance,
  cadenceDrift,
  buildSuggestions,
} from '@/services/balanceService';
import type { Person, RelationshipType } from '@/types/people';
import type { Interaction, InteractionQuality } from '@/types/interactions';

const NOW = new Date('2026-06-10T12:00:00Z');
const DAY = 86_400_000;

function p(id: string, type: RelationshipType, last?: string): Person {
  return {
    id, owner_id: 'u', full_name: id.toUpperCase(),
    photo_url: null, relationship_type: type,
    relationship_goal: 'maintain', how_we_met: null, met_on: null,
    location: null, birthday: null, life_context: {},
    communication_pref: null, notes: null, custom_fields: [],
    fading_threshold_days: 30, last_contacted_at: last ?? null,
    priority_tier: null, cadence_days: null, do_not_nudge_until: null, social_capacity: null,
    created_at: '2024-01-01', updated_at: '2024-01-01',
  };
}

function ix(personId: string, daysAgo: number, quality: InteractionQuality = 'quick'): Interaction {
  const t = new Date(NOW.getTime() - daysAgo * DAY).toISOString();
  return {
    id: `${personId}-${daysAgo}`, owner_id: 'u', person_id: personId,
    kind: 'text', quality, duration_minutes: null, notes: null,
    occurred_at: t, created_at: t,
  };
}

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(NOW); });
afterEach(() => vi.useRealTimers());

describe('groupBalance', () => {
  it('aggregates per relationship_type with shares summing to 1', () => {
    const people = [
      p('a', 'family', new Date(NOW.getTime() - 5 * DAY).toISOString()),
      p('b', 'family', new Date(NOW.getTime() - 40 * DAY).toISOString()),
      p('c', 'close_friend', new Date(NOW.getTime() - 2 * DAY).toISOString()),
    ];
    const ixs = [ix('a', 5), ix('a', 12), ix('b', 40), ix('c', 2)];
    const groups = groupBalance(people, ixs, NOW);
    const family = groups.find((g) => g.type === 'family')!;
    const friend = groups.find((g) => g.type === 'close_friend')!;
    expect(family.count).toBe(2);
    expect(family.fadingOrDormant).toBe(1); // b is past 30d
    expect(family.recentInteractions30d).toBe(2); // a:5, a:12 (b is 40 = outside)
    expect(friend.recentInteractions30d).toBe(1);
    const totalShare = groups.reduce((s, g) => s + g.share, 0);
    expect(totalShare).toBeCloseTo(1, 5);
  });

  it('handles never-contacted people as fading', () => {
    const people = [p('a', 'family')];
    const groups = groupBalance(people, [], NOW);
    expect(groups[0].fadingOrDormant).toBe(1);
    expect(groups[0].avgDaysSinceContact).toBeNull();
  });

  it('buckets nullable relationship_type as unsorted', () => {
    const someone = p('a', 'family');
    someone.relationship_type = null;
    const groups = groupBalance([someone], [], NOW);
    expect(groups[0].type).toBe('unsorted');
    expect(groups[0].label).toBe('Unsorted');
  });
});

describe('cadenceDrift', () => {
  it('flags a monthly contact who is now silent for 60+ days', () => {
    const person = p('a', 'close_friend');
    const ixs = [ix('a', 150), ix('a', 120), ix('a', 90), ix('a', 60)];
    const drifts = cadenceDrift([person], ixs, NOW);
    expect(drifts).toHaveLength(1);
    expect(drifts[0].typicalCadenceDays).toBe(30);
    expect(drifts[0].currentGapDays).toBe(60);
    expect(drifts[0].driftRatio).toBeCloseTo(2, 1);
  });

  it('skips people without enough history', () => {
    const person = p('a', 'close_friend');
    const ixs = [ix('a', 10), ix('a', 5)];
    expect(cadenceDrift([person], ixs, NOW)).toHaveLength(0);
  });

  it('does not flag healthy cadences', () => {
    const person = p('a', 'close_friend');
    const ixs = [ix('a', 28), ix('a', 21), ix('a', 14), ix('a', 7)];
    expect(cadenceDrift([person], ixs, NOW)).toHaveLength(0);
  });

  it('uses user-set cadence_days when provided, overriding the median', () => {
    // Logged history suggests ~30-day cadence (would NOT flag at 30d gap).
    // But user set cadence_days=7, so 30d gap becomes a 4.3x drift.
    const person = { ...p('a', 'close_friend'), cadence_days: 7 };
    const ixs = [ix('a', 90), ix('a', 60), ix('a', 30)];
    const drifts = cadenceDrift([person], ixs, NOW);
    expect(drifts).toHaveLength(1);
    expect(drifts[0].typicalCadenceDays).toBe(7);
    expect(drifts[0].currentGapDays).toBe(30);
  });
});

describe('buildSuggestions', () => {
  it('promotes the worst drift to the top', () => {
    const drifter = p('a', 'close_friend');
    const ok = p('b', 'close_friend');
    const ixs = [
      ix('a', 200), ix('a', 170), ix('a', 140), ix('a', 110),
      ix('b', 7), ix('b', 14), ix('b', 21),
    ];
    const sugg = buildSuggestions([drifter, ok], ixs, NOW);
    expect(sugg[0].kind).toBe('reach_out');
    expect(sugg[0].personId).toBe('a');
  });

  it('emits a celebrate suggestion for a fresh deep catch-up', () => {
    const a = p('a', 'close_friend');
    const sugg = buildSuggestions([a], [ix('a', 1, 'deep')], NOW);
    expect(sugg.some((s) => s.kind === 'celebrate')).toBe(true);
  });

  it('returns empty list when there is no signal', () => {
    expect(buildSuggestions([], [], NOW)).toEqual([]);
  });
});
