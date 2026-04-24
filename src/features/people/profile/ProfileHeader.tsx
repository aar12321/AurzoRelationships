import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { Person } from '@/types/people';
import { RELATIONSHIP_TYPE_LABELS } from '@/types/people';
import { computeStrength } from '@/services/interactionsService';
import { useInteractionsStore } from '@/stores/interactionsStore';
import StrengthDot from '../StrengthDot';
import QuickLogButton from './QuickLogButton';
import PinToggle from './PinToggle';
import AvatarUploader from './AvatarUploader';

type Props = { person: Person };

export default function ProfileHeader({ person }: Props) {
  // computeStrength reads the interactions array directly, so the dot
  // updates the instant QuickLogButton writes — no staleness waiting on
  // the next people-row refresh. Kicks a load if the store is empty.
  const { interactions, load } = useInteractionsStore();
  useEffect(() => {
    if (interactions.length === 0) void load();
  }, [interactions.length, load]);
  const strength = computeStrength(person, interactions);
  return (
    <header className="card-journal mb-6">
      <div className="flex items-start gap-5">
        <AvatarUploader person={person} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-4xl font-serif text-charcoal-900 dark:text-cream-50 truncate">
              {person.full_name}
            </h1>
            <StrengthDot strength={strength} withLabel />
          </div>
          <div className="mt-1 flex flex-wrap gap-2 text-sm text-charcoal-500">
            {person.relationship_type && (
              <span className="chip">
                {RELATIONSHIP_TYPE_LABELS[person.relationship_type]}
              </span>
            )}
            {person.location && <span className="chip">{person.location}</span>}
            {person.birthday && (
              <span className="chip">
                🎂 {new Date(person.birthday).toLocaleDateString(undefined, {
                  month: 'short', day: 'numeric',
                })}
              </span>
            )}
          </div>
        </div>
        <PinToggle person={person} />
      </div>

      <nav className="mt-5 flex flex-wrap gap-2 items-center">
        <QuickLogButton
          personId={person.id}
          firstName={person.full_name.split(/\s+/)[0] ?? person.full_name}
        />
        <Link to={`/relationships/people/${person.id}/messages`} className="btn-ghost border border-cream-200 dark:border-charcoal-700">
          Compose
        </Link>
        <Link to={`/relationships/people/${person.id}/gifts`} className="btn-ghost border border-cream-200 dark:border-charcoal-700">
          Gift ideas
        </Link>
        <Link to={`/relationships/people/${person.id}/memories`} className="btn-ghost border border-cream-200 dark:border-charcoal-700">
          Memories
        </Link>
        <Link to={`/relationships/people/${person.id}/edit`}
              className="btn-ghost border border-cream-200 dark:border-charcoal-700 ml-auto">
          Edit
        </Link>
      </nav>
    </header>
  );
}
