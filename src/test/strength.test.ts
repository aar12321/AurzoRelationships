import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { deriveStrength } from '@/services/peopleService';
import { computeStrength, lastContactLabel } from '@/services/interactionsService';
import type { Person } from '@/types/people';
import type { Interaction } from '@/types/interactions';

function person(partial: Partial<Person> = {}): Person {
  return {
    id: 'p', owner_id: 'u', full_name: 'Sam',
    photo_url: null, relationship_type: 'close_friend',
    relationship_goal: 'maintain', how_we_met: null, met_on: null,
    location: null, birthday: null, life_context: {},
    communication_pref: null, notes: null, custom_fields: [],
    fading_threshold_days: 30, last_contacted_at: null,
    priority_tier: null, cadence_days: null, do_not_nudge_until: null, social_capacity: null,
    created_at: '2024-01-01', updated_at: '2024-01-01',
    ...partial,
  };
}

function ix(partial: Partial<Interaction> = {}): Interaction {
  return {
    id: 'i', owner_id: 'u', person_id: 'p',
    kind: 'text', quality: 'quick', duration_minutes: null,
    notes: null, occurred_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    ...partial,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-06-10T12:00:00Z'));
});
afterEach(() => vi.useRealTimers());

describe('deriveStrength (recency only)', () => {
  it('returns unknown when no contact ever', () => {
    expect(deriveStrength(null, null)).toBe('unknown');
  });
  it('thriving for very recent contact', () => {
    expect(deriveStrength('2026-06-09T00:00:00Z', 30)).toBe('thriving');
  });
  it('active within half the threshold window', () => {
    const d = new Date('2026-05-20T00:00:00Z').toISOString();
    expect(deriveStrength(d, 30)).toBe('active');
  });
  it('fading past the threshold', () => {
    const d = new Date('2026-05-01T00:00:00Z').toISOString();
    expect(deriveStrength(d, 30)).toBe('fading');
  });
  it('dormant after triple the threshold', () => {
    const d = new Date('2026-01-01T00:00:00Z').toISOString();
    expect(deriveStrength(d, 30)).toBe('dormant');
  });
});

describe('computeStrength (quality-aware)', () => {
  it('elevates to thriving with enough meaningful recent contact', () => {
    const p = person({ last_contacted_at: new Date('2026-06-01').toISOString() });
    const now = new Date();
    const ixs: Interaction[] = [
      ix({ occurred_at: new Date(now.getTime() - 3 * 86_400_000).toISOString(), quality: 'deep' }),
      ix({ occurred_at: new Date(now.getTime() - 10 * 86_400_000).toISOString(), quality: 'meaningful' }),
    ];
    expect(computeStrength(p, ixs)).toBe('thriving');
  });
  it('stays active with only a quick text', () => {
    const p = person({ last_contacted_at: new Date('2026-06-05').toISOString() });
    const ixs: Interaction[] = [ix({ quality: 'quick' })];
    expect(computeStrength(p, ixs)).toBe('active');
  });
  it('treats as dormant when too long has passed', () => {
    const p = person({ last_contacted_at: '2025-01-01T00:00:00Z' });
    expect(computeStrength(p, [])).toBe('dormant');
  });
  it('unknown when no data at all', () => {
    expect(computeStrength(person(), [])).toBe('unknown');
  });
});

describe('lastContactLabel', () => {
  it('handles no contact', () => {
    expect(lastContactLabel(null)).toBe('No contact yet');
  });
  it('today / yesterday / days / weeks / months', () => {
    const now = Date.now();
    expect(lastContactLabel(new Date(now - 1 * 3_600_000).toISOString())).toBe('Today');
    expect(lastContactLabel(new Date(now - 1.2 * 86_400_000).toISOString())).toBe('Yesterday');
    expect(lastContactLabel(new Date(now - 3 * 86_400_000).toISOString())).toBe('3d ago');
    expect(lastContactLabel(new Date(now - 10 * 86_400_000).toISOString())).toBe('1w ago');
    expect(lastContactLabel(new Date(now - 70 * 86_400_000).toISOString())).toBe('2mo ago');
  });
});
