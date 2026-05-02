import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { buildSuggestions, type Suggestion } from '@/services/balanceService';
import { usePeopleStore } from '@/stores/peopleStore';
import { useInteractionsStore } from '@/stores/interactionsStore';

const KIND_TONE: Record<Suggestion['kind'], string> = {
  reach_out: 'border-l-terracotta-500 bg-terracotta-50/40',
  rebalance: 'border-l-gold-500 bg-gold-50/40',
  celebrate: 'border-l-gold-300 bg-cream-50',
  rest: 'border-l-charcoal-300 bg-cream-50',
};

const KIND_ICON: Record<Suggestion['kind'], string> = {
  reach_out: '↗',
  rebalance: '⚖',
  celebrate: '✨',
  rest: '·',
};

export default function SuggestionsPanel() {
  const people = usePeopleStore((s) => s.people);
  const interactions = useInteractionsStore((s) => s.interactions);
  const suggestions = useMemo(
    () => buildSuggestions(people, interactions).slice(0, 4),
    [people, interactions],
  );

  if (suggestions.length === 0) return null;

  return (
    <div className="card-journal mb-6">
      <h2 className="text-xs uppercase tracking-wider text-charcoal-500 dark:text-charcoal-300 mb-3">
        Gentle suggestions
      </h2>
      <ul className="space-y-2">
        {suggestions.map((s) => (
          <SuggestionRow key={s.id} suggestion={s} />
        ))}
      </ul>
    </div>
  );
}

function SuggestionRow({ suggestion }: { suggestion: Suggestion }) {
  const body = (
    <div className={`flex items-start gap-3 px-3 py-2 border-l-2 rounded-journal ${KIND_TONE[suggestion.kind]}`}>
      <span aria-hidden className="text-lg leading-none mt-0.5">
        {KIND_ICON[suggestion.kind]}
      </span>
      <p className="flex-1 text-sm text-charcoal-900 dark:text-cream-50">
        {suggestion.text}
      </p>
    </div>
  );
  if (suggestion.personId) {
    return (
      <li>
        <Link to={`/relationships/people/${suggestion.personId}`}
          className="block hover:opacity-90 transition-opacity">
          {body}
        </Link>
      </li>
    );
  }
  return <li>{body}</li>;
}
