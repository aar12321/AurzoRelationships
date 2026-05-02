import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { usePeopleStore } from '@/stores/peopleStore';
import { useInteractionsStore } from '@/stores/interactionsStore';
import { computeStrength, lastContactLabel } from '@/services/interactionsService';
import PersonAvatar from '@/features/people/PersonAvatar';
import StrengthDot from '@/features/people/StrengthDot';

export default function InnerCirclePanel() {
  const people = usePeopleStore((s) => s.people);
  const interactions = useInteractionsStore((s) => s.interactions);

  const innerCircle = useMemo(() => {
    return people
      .filter((p) => p.priority_tier === 'inner')
      .map((p) => ({
        person: p,
        strength: computeStrength(p, interactions),
        daysSince: p.last_contacted_at
          ? Math.floor((Date.now() - new Date(p.last_contacted_at).getTime()) / 86_400_000)
          : Number.POSITIVE_INFINITY,
      }))
      .sort((a, b) => b.daysSince - a.daysSince)
      .slice(0, 6);
  }, [people, interactions]);

  if (innerCircle.length === 0) return null;

  return (
    <section className="card-journal mb-8">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="font-serif text-xl text-charcoal-900 dark:text-cream-50">
          Inner circle
        </h2>
        <Link to="/relationships/people"
          className="text-xs text-charcoal-500 dark:text-charcoal-300 hover:underline">
          Manage
        </Link>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {innerCircle.map(({ person, strength }) => (
          <li key={person.id}>
            <Link to={`/relationships/people/${person.id}`}
              className="flex items-center gap-3 rounded-journal p-2
                         hover:bg-cream-50 dark:hover:bg-charcoal-800 transition-colors">
              <PersonAvatar name={person.full_name} photoUrl={person.photo_url} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="text-sm text-charcoal-900 dark:text-cream-50 truncate">
                  {person.full_name}
                </div>
                <div className="text-xs text-charcoal-500 dark:text-charcoal-300">
                  {lastContactLabel(person.last_contacted_at)}
                </div>
              </div>
              <StrengthDot strength={strength} />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
