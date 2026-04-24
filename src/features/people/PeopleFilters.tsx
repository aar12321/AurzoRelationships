import type { PersonGroup, RelationshipType } from '@/types/people';
import { RELATIONSHIP_TYPE_LABELS } from '@/types/people';

type Props = {
  search: string;
  onSearch: (v: string) => void;
  type: RelationshipType | 'all';
  onType: (v: RelationshipType | 'all') => void;
  groups: PersonGroup[];
  groupId: string | 'all';
  onGroup: (v: string | 'all') => void;
  recentQueries?: string[];
};

const TYPES = Object.entries(RELATIONSHIP_TYPE_LABELS) as [RelationshipType, string][];

export default function PeopleFilters({
  search, onSearch, type, onType, groups, groupId, onGroup, recentQueries = [],
}: Props) {
  const showRecents = search.trim() === '' && recentQueries.length > 0;
  return (
    <div className="space-y-3 mb-6">
      <input
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        placeholder="Search anyone…"
        className="w-full rounded-journal border border-cream-200 bg-ivory-50
                   dark:border-charcoal-700 dark:bg-charcoal-800 dark:text-cream-50
                   px-4 py-2.5 text-charcoal-900 placeholder:text-charcoal-500/60
                   focus:outline-none focus:border-terracotta-500"
      />

      {showRecents && (
        <div className="flex flex-wrap items-center gap-2 -mt-1">
          <span className="text-xs uppercase tracking-wider text-charcoal-500 dark:text-charcoal-300">
            Recent
          </span>
          {recentQueries.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => onSearch(q)}
              className="rounded-full px-3 py-1 text-xs border border-cream-200
                         dark:border-charcoal-700 bg-ivory-50 dark:bg-charcoal-800
                         text-charcoal-700 dark:text-cream-100
                         hover:bg-cream-100 dark:hover:bg-charcoal-700 transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Pill active={type === 'all'} onClick={() => onType('all')}>
          Everyone
        </Pill>
        {TYPES.map(([k, label]) => (
          <Pill key={k} active={type === k} onClick={() => onType(k)}>
            {label}
          </Pill>
        ))}
      </div>

      {groups.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Pill active={groupId === 'all'} onClick={() => onGroup('all')} subtle>
            All circles
          </Pill>
          {groups.map((g) => (
            <Pill
              key={g.id}
              active={groupId === g.id}
              onClick={() => onGroup(g.id)}
              subtle
            >
              {g.name}
            </Pill>
          ))}
        </div>
      )}
    </div>
  );
}

function Pill({
  active, subtle, onClick, children,
}: {
  active: boolean;
  subtle?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const base = 'rounded-full px-3 py-1 text-xs transition-colors border';
  const on = subtle
    ? 'bg-gold-300/40 border-gold-500 text-charcoal-900'
    : 'bg-terracotta-600 border-terracotta-600 text-ivory-50';
  const off = 'bg-ivory-50 border-cream-200 text-charcoal-500 hover:bg-cream-100';
  return (
    <button onClick={onClick} className={[base, active ? on : off].join(' ')}>
      {children}
    </button>
  );
}
