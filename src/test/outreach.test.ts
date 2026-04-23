import { describe, expect, it } from 'vitest';
import { draftVariants } from '@/services/outreachService';
import type { Person } from '@/types/people';

const sam: Person = {
  id: 'p', owner_id: 'u', full_name: 'Sam Rivera',
  photo_url: null, relationship_type: 'close_friend',
  relationship_goal: 'deepen', how_we_met: null, met_on: null,
  location: null, birthday: null, life_context: {},
  communication_pref: null, notes: null, custom_fields: [],
  fading_threshold_days: null, last_contacted_at: null,
  created_at: '2024-01-01', updated_at: '2024-01-01',
};

describe('draftVariants', () => {
  it('returns exactly 3 variants for every occasion', () => {
    const occasions = [
      'birthday', 'check_in_hard_time', 'congratulations', 'long_time',
      'thank_you', 'thinking_of_you', 'holiday', 'apology', 'sympathy',
    ] as const;
    for (const o of occasions) {
      const v = draftVariants(sam, o, 'warm', 'text');
      expect(v).toHaveLength(3);
      for (const body of v) expect(body.length).toBeGreaterThan(0);
    }
  });

  it('personalizes with the first name', () => {
    const v = draftVariants(sam, 'birthday', 'warm', 'text');
    expect(v[0]).toContain('Sam');
    expect(v[0]).not.toContain('Rivera');
  });

  it('voice-note channel prepends a speaking hint', () => {
    const v = draftVariants(sam, 'thinking_of_you', 'heartfelt', 'voice_note');
    expect(v[0].startsWith('(Voice note')).toBe(true);
  });

  it('brief tone keeps it short', () => {
    const brief = draftVariants(sam, 'holiday', 'brief', 'text');
    const warm = draftVariants(sam, 'holiday', 'warm', 'text');
    expect(brief[0].length).toBeLessThanOrEqual(warm[0].length + 10);
  });
});
