import { Link } from 'react-router-dom';
import type { ImportantDate } from '@/types/dates';
import {
  DATE_TYPE_EMOJI, DATE_TYPE_LABELS, daysUntil, turningAge,
} from '@/types/dates';
import { usePeopleStore } from '@/stores/peopleStore';

type Props = { date: ImportantDate; onEdit?: () => void; onDelete?: () => void };

export default function DateRow({ date, onEdit, onDelete }: Props) {
  const people = usePeopleStore((s) => s.people);
  const person = people.find((p) => p.id === date.person_id);
  const n = daysUntil(date);
  const age = turningAge(date);

  const label =
    n === 0 ? 'Today' :
    n === 1 ? 'Tomorrow' :
    n < 0 ? `${-n}d ago` :
    n < 30 ? `in ${n}d` :
    `in ${Math.round(n / 30)}mo`;

  const body = (
    <div className="flex items-center gap-3 py-3">
      <span className="text-2xl" aria-hidden>{DATE_TYPE_EMOJI[date.date_type]}</span>
      <div className="flex-1 min-w-0">
        <div className="font-serif text-lg text-charcoal-900 truncate">
          {date.label}
          {age != null && <span className="text-charcoal-500 text-sm"> · turning {age}</span>}
        </div>
        <div className="text-xs text-charcoal-500">
          {DATE_TYPE_LABELS[date.date_type]}
          {person && <> · {person.full_name}</>}
        </div>
      </div>
      <div className={[
        'text-xs px-2 py-1 rounded-full whitespace-nowrap',
        n <= 0 ? 'bg-terracotta-600 text-ivory-50' :
        n <= 7 ? 'bg-gold-300 text-charcoal-900' :
        'bg-cream-200 text-charcoal-500',
      ].join(' ')}>{label}</div>
      {onEdit && (
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(); }}
          className="btn-ghost text-xs"
          aria-label="Edit"
        >
          Edit
        </button>
      )}
      {onDelete && (
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(); }}
          className="btn-ghost text-xs"
          aria-label="Delete"
        >
          ✕
        </button>
      )}
    </div>
  );

  if (person) {
    return (
      <Link to={`/relationships/people/${person.id}`}
        className="block border-b border-cream-200 last:border-0 hover:bg-cream-100 px-2 rounded-journal">
        {body}
      </Link>
    );
  }
  return <div className="border-b border-cream-200 last:border-0 px-2">{body}</div>;
}
