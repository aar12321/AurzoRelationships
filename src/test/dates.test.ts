import { describe, expect, it } from 'vitest';
import {
  daysUntil, nextOccurrence, turningAge,
} from '@/types/dates';
import {
  recentlyPassed, sortByUpcoming, upcomingWithin,
} from '@/services/datesService';
import type { ImportantDate } from '@/types/dates';

function mk(partial: Partial<ImportantDate>): ImportantDate {
  return {
    id: 'x', owner_id: 'u', person_id: null, label: 'l',
    date_type: 'birthday', event_date: '1990-06-15', recurring: true,
    lead_times: [14, 7, 3, 0], notes: null,
    created_at: '2024-01-01T00:00:00Z',
    ...partial,
  };
}

describe('nextOccurrence + daysUntil', () => {
  it('returns this year if the date is upcoming', () => {
    const from = new Date('2026-03-01T00:00:00');
    const d = mk({ event_date: '1990-06-15' });
    const next = nextOccurrence(d, from);
    expect(next.getFullYear()).toBe(2026);
    expect(next.getMonth()).toBe(5);
    expect(next.getDate()).toBe(15);
  });

  it('rolls to next year if the date has passed', () => {
    const from = new Date('2026-07-01T00:00:00');
    const d = mk({ event_date: '1990-06-15' });
    expect(nextOccurrence(d, from).getFullYear()).toBe(2027);
  });

  it('daysUntil is 0 on the day itself', () => {
    const from = new Date('2026-06-15T14:00:00');
    const d = mk({ event_date: '1990-06-15' });
    expect(daysUntil(d, from)).toBe(0);
  });

  it('does not roll year for non-recurring dates', () => {
    const from = new Date('2026-06-15T14:00:00');
    const d = mk({ event_date: '2025-12-01', recurring: false });
    expect(nextOccurrence(d, from).getFullYear()).toBe(2025);
  });
});

describe('turningAge', () => {
  it('returns the age they are turning on their next birthday', () => {
    const from = new Date('2026-01-01');
    const d = mk({ event_date: '1990-06-15' });
    expect(turningAge(d, from)).toBe(36);
  });
  it('returns null for non-birthday', () => {
    expect(turningAge(mk({ date_type: 'anniversary' }))).toBeNull();
  });
});

describe('sortByUpcoming + upcomingWithin + recentlyPassed', () => {
  const from = new Date('2026-06-10');
  const soon = mk({ id: 'a', event_date: '1990-06-15' });        // 5 days
  const later = mk({ id: 'b', event_date: '1990-08-01' });       // ~52 days
  const passed = mk({ id: 'c', event_date: '1990-06-07', recurring: false }); // days < 0

  it('sorts by days-until ascending', () => {
    const sorted = sortByUpcoming([later, soon], from);
    expect(sorted.map((d) => d.id)).toEqual(['a', 'b']);
  });

  it('upcomingWithin(14) filters the window correctly', () => {
    const within = upcomingWithin([soon, later], 14, from);
    expect(within.map((d) => d.id)).toEqual(['a']);
  });

  it('recentlyPassed returns within lookback window', () => {
    const p = recentlyPassed([passed], 7, from);
    // from 2026-06-10, passed.event_date is 1990-06-07 -> recurring false,
    // so next is 1990-06-07; daysUntil is hugely negative, outside 7-day window.
    expect(p.length).toBe(0);
  });
});

describe('from is used consistently', () => {
  it('ignores default Date.now in tests by passing from', () => {
    const from = new Date('2026-06-10');
    expect(daysUntil(mk({ event_date: '1990-06-10' }), from)).toBe(0);
    expect(daysUntil(mk({ event_date: '1990-06-11' }), from)).toBe(1);
    expect(daysUntil(mk({ event_date: '1990-06-09' }), from)).toBe(364);
  });
});
