import { Link } from 'react-router-dom';
import type { Person } from '@/types/people';
import { RELATIONSHIP_TYPE_LABELS } from '@/types/people';
import { deriveStrength } from '@/services/peopleService';
import PersonAvatar from '../PersonAvatar';
import StrengthDot from '../StrengthDot';

type Props = { person: Person };

export default function ProfileHeader({ person }: Props) {
  const strength = deriveStrength(person.last_contacted_at, person.fading_threshold_days);
  return (
    <header className="card-journal mb-6">
      <div className="flex items-start gap-5">
        <PersonAvatar name={person.full_name} photoUrl={person.photo_url} size="lg" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-4xl font-serif text-charcoal-900 truncate">
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
      </div>

      <nav className="mt-5 flex flex-wrap gap-2">
        <Link to={`/relationships/people/${person.id}/messages`} className="btn-ghost border border-cream-200">
          Compose
        </Link>
        <Link to={`/relationships/people/${person.id}/gifts`} className="btn-ghost border border-cream-200">
          Gift ideas
        </Link>
        <Link to={`/relationships/people/${person.id}/memories`} className="btn-ghost border border-cream-200">
          Memories
        </Link>
      </nav>
    </header>
  );
}
