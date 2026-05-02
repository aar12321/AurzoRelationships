import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PersonCard from '@/features/people/PersonCard';
import StrengthDot from '@/features/people/StrengthDot';
import PersonAvatar from '@/features/people/PersonAvatar';
import type { Person } from '@/types/people';

function mk(partial: Partial<Person> = {}): Person {
  return {
    id: 'p', owner_id: 'u', full_name: 'Alex Quinn',
    photo_url: null, relationship_type: 'close_friend',
    relationship_goal: 'maintain', how_we_met: null, met_on: null,
    location: 'Brooklyn', birthday: null, life_context: {},
    communication_pref: null, notes: null, custom_fields: [],
    fading_threshold_days: null, last_contacted_at: null,
    priority_tier: null, cadence_days: null, do_not_nudge_until: null, social_capacity: null,
    created_at: '2024-01-01', updated_at: '2024-01-01',
    ...partial,
  };
}

describe('PersonCard', () => {
  it('renders the name and relationship type', () => {
    render(
      <MemoryRouter>
        <PersonCard person={mk()} />
      </MemoryRouter>,
    );
    expect(screen.getByText('Alex Quinn')).toBeInTheDocument();
    expect(screen.getByText('Close friend')).toBeInTheDocument();
  });

  it('links to the person profile', () => {
    render(
      <MemoryRouter>
        <PersonCard person={mk({ id: 'abc' })} />
      </MemoryRouter>,
    );
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('/relationships/people/abc');
  });
});

describe('PersonAvatar', () => {
  it('renders initials when no photo', () => {
    render(<PersonAvatar name="Mina Sato" />);
    expect(screen.getByText('MS')).toBeInTheDocument();
  });
});

describe('StrengthDot', () => {
  it('renders a label when withLabel is set', () => {
    render(<StrengthDot strength="thriving" withLabel />);
    expect(screen.getByText('Thriving')).toBeInTheDocument();
  });
});
