import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePeopleStore } from '@/stores/peopleStore';
import type { RelationshipType } from '@/types/people';
import PeopleFilters from './PeopleFilters';
import PersonCard from './PersonCard';

export default function PeopleDirectoryPage() {
  const { people, groups, memberships, loading, error, loadAll } = usePeopleStore();
  const [search, setSearch] = useState('');
  const [type, setType] = useState<RelationshipType | 'all'>('all');
  const [groupId, setGroupId] = useState<string | 'all'>('all');

  useEffect(() => {
    if (people.length === 0) void loadAll();
  }, [loadAll, people.length]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return people.filter((p) => {
      if (q && !p.full_name.toLowerCase().includes(q)) return false;
      if (type !== 'all' && p.relationship_type !== type) return false;
      if (groupId !== 'all' && !memberships.get(p.id)?.has(groupId)) return false;
      return true;
    });
  }, [people, search, type, groupId, memberships]);

  return (
    <section className="animate-bloom">
      <header className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl">People</h1>
          <p className="text-charcoal-500 mt-1">
            The people who matter, remembered with care.
          </p>
        </div>
        <Link to="/relationships/people/new" className="btn-primary">
          Add someone
        </Link>
      </header>

      <PeopleFilters
        search={search}
        onSearch={setSearch}
        type={type}
        onType={setType}
        groups={groups}
        groupId={groupId}
        onGroup={setGroupId}
      />

      {loading && people.length === 0 ? (
        <SkeletonGrid />
      ) : error ? (
        <div className="card-journal text-terracotta-700">{error}</div>
      ) : filtered.length === 0 ? (
        <EmptyState hasAny={people.length > 0} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p, i) => (
            <PersonCard key={p.id} person={p} index={i} />
          ))}
        </div>
      )}
    </section>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="card-journal">
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 rounded-full bg-cream-200 animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-2/3 bg-cream-200 rounded animate-pulse" />
              <div className="h-3 w-1/3 bg-cream-200 rounded animate-pulse" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ hasAny }: { hasAny: boolean }) {
  return (
    <div className="card-journal text-center py-12">
      <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-cream-200" />
      {hasAny ? (
        <p className="text-charcoal-700">No one matches those filters.</p>
      ) : (
        <>
          <p className="text-charcoal-700">
            No one added yet — start with someone who's been on your mind.
          </p>
          <Link to="/relationships/people/new" className="btn-primary mt-4 inline-flex">
            Add your first person
          </Link>
        </>
      )}
    </div>
  );
}
