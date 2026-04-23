import { Link } from 'react-router-dom';
import type { Person } from '@/types/people';
import { RELATIONSHIP_TYPE_LABELS } from '@/types/people';
import { deriveStrength } from '@/services/peopleService';
import PersonAvatar from './PersonAvatar';
import StrengthDot from './StrengthDot';

type Props = { person: Person; index?: number };

function lastContactLabel(iso: string | null): string {
  if (!iso) return 'No contact yet';
  const days = Math.floor(
    (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24),
  );
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 60) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

export default function PersonCard({ person, index = 0 }: Props) {
  const strength = deriveStrength(person.last_contacted_at, person.fading_threshold_days);
  return (
    <Link
      to={`/relationships/people/${person.id}`}
      className="card-journal hover:shadow-warm hover:-translate-y-0.5 transition-all
                 animate-bloom block"
      style={{ animationDelay: `${Math.min(index * 30, 300)}ms` }}
    >
      <div className="flex items-start gap-4">
        <PersonAvatar name={person.full_name} photoUrl={person.photo_url} size="md" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-serif text-xl text-charcoal-900 truncate">
              {person.full_name}
            </h3>
            <StrengthDot strength={strength} />
          </div>
          {person.relationship_type && (
            <div className="mt-1 text-xs text-charcoal-500">
              {RELATIONSHIP_TYPE_LABELS[person.relationship_type]}
            </div>
          )}
          <div className="mt-3 text-xs text-charcoal-500">
            {lastContactLabel(person.last_contacted_at)}
          </div>
        </div>
      </div>
    </Link>
  );
}
