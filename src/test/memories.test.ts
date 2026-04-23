import { describe, expect, it } from 'vitest';
import { onThisDay } from '@/services/memoriesService';
import type { Memory } from '@/types/memories';

function mem(p: Partial<Memory>): Memory {
  return {
    id: p.id ?? 'm',
    owner_id: 'u',
    title: null,
    note: null,
    memory_type: null,
    mood: null,
    location: null,
    occurred_on: null,
    photo_urls: [],
    created_at: '2024-01-01',
    ...p,
  };
}

describe('onThisDay', () => {
  const when = new Date('2026-06-10T12:00:00');

  it('includes memories on the same month+day from prior years', () => {
    const m = mem({ id: '1', occurred_on: '2022-06-10' });
    expect(onThisDay([m], when).map((x) => x.id)).toEqual(['1']);
  });

  it('excludes memories from the same year as today', () => {
    const m = mem({ id: '1', occurred_on: '2026-06-10' });
    expect(onThisDay([m], when)).toEqual([]);
  });

  it('excludes memories without an occurred_on date', () => {
    const m = mem({ id: '1', occurred_on: null });
    expect(onThisDay([m], when)).toEqual([]);
  });

  it('excludes memories on a different day', () => {
    const m = mem({ id: '1', occurred_on: '2020-06-11' });
    expect(onThisDay([m], when)).toEqual([]);
  });
});
