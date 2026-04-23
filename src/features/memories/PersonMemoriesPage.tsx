import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { usePeopleStore } from '@/stores/peopleStore';
import { listMemories } from '@/services/memoriesService';
import type { Memory } from '@/types/memories';
import AddMemoryForm from './AddMemoryForm';
import MemoryCard from './MemoryCard';

export default function PersonMemoriesPage() {
  const { id } = useParams();
  const people = usePeopleStore((s) => s.people);
  const loadPeople = usePeopleStore((s) => s.loadAll);
  const [memories, setMemories] = useState<Memory[] | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => { if (people.length === 0) void loadPeople(); }, [loadPeople, people.length]);
  useEffect(() => {
    if (id) void listMemories(id).then(setMemories);
  }, [id, showAdd]);

  const person = people.find((p) => p.id === id);
  if (!person) return <div className="text-charcoal-500 text-sm">Loading…</div>;

  return (
    <section className="animate-bloom">
      <Link to={`/relationships/people/${person.id}`} className="text-xs text-charcoal-500">
        ← {person.full_name}
      </Link>
      <header className="mb-6 mt-1 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl">Memories with {person.full_name.split(' ')[0]}</h1>
          <p className="text-charcoal-500 mt-1">Your shared scrapbook.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAdd((v) => !v)}>
          {showAdd ? 'Close' : 'Add memory'}
        </button>
      </header>

      {showAdd && (
        <div className="mb-6">
          <AddMemoryForm personId={person.id} onDone={() => setShowAdd(false)} />
        </div>
      )}

      {!memories ? (
        <div className="text-charcoal-500 text-sm">Loading…</div>
      ) : memories.length === 0 ? (
        <div className="card-journal text-center py-12">
          <p className="text-charcoal-700">No memories yet. Capture one — even something small.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {memories.map((m) => <MemoryCard key={m.id} memory={m} />)}
        </div>
      )}
    </section>
  );
}
