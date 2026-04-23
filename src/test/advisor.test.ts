import { describe, expect, it } from 'vitest';
import { localAdvise } from '@/services/advisorService';
import type { Person } from '@/types/people';
import type { ImportantDate } from '@/types/dates';

function mkP(partial: Partial<Person> = {}): Person {
  return {
    id: 'p', owner_id: 'u', full_name: 'Jamie Park',
    photo_url: null, relationship_type: 'close_friend',
    relationship_goal: 'maintain', how_we_met: null, met_on: null,
    location: null, birthday: null, life_context: {},
    communication_pref: null, notes: null, custom_fields: [],
    fading_threshold_days: null, last_contacted_at: null,
    created_at: '2024-01-01', updated_at: '2024-01-01',
    ...partial,
  };
}

describe('localAdvise', () => {
  it('suggests dormant people when asked who to reach out to', () => {
    const people = [
      mkP({ id: 'a', full_name: 'Alex', last_contacted_at: null }),
      mkP({ id: 'b', full_name: 'Bee',
        last_contacted_at: new Date(Date.now() - 40 * 86_400_000).toISOString() }),
      mkP({ id: 'c', full_name: 'Cee',
        last_contacted_at: new Date(Date.now() - 1 * 86_400_000).toISOString() }),
    ];
    const reply = localAdvise("Who should I reach out to?", people, []);
    expect(reply).toContain('Alex');
    expect(reply).toContain('Bee');
    expect(reply).not.toContain('Cee');
  });

  it('offers reconnect guidance for long-time questions', () => {
    const reply = localAdvise("I haven't talked to them in a long time, help", [], []);
    expect(reply.toLowerCase()).toContain('guilt');
  });

  it('coaches for hard messages', () => {
    const reply = localAdvise('I need to write a hard message', [], []);
    expect(reply.toLowerCase()).toContain('feel');
  });

  it('surfaces upcoming dates as a fallback', () => {
    const nearDate: ImportantDate = {
      id: 'd', owner_id: 'u', person_id: null,
      label: "Dad's birthday", date_type: 'birthday',
      event_date: new Date(Date.now() + 5 * 86_400_000).toISOString().slice(0, 10),
      recurring: true, lead_times: [], notes: null,
      created_at: '2024-01-01',
    };
    const reply = localAdvise("anything on my mind", [], [nearDate]);
    expect(reply).toContain("Dad's birthday");
  });
});
