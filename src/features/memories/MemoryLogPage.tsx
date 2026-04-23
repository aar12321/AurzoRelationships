import { useEffect, useMemo, useState } from 'react';
import { useMemoriesStore } from '@/stores/memoriesStore';
import { usePeopleStore } from '@/stores/peopleStore';
import { onThisDay } from '@/services/memoriesService';
import AddMemoryForm from './AddMemoryForm';
import MemoryCard from './MemoryCard';

export default function MemoryLogPage() {
  const { memories, load, remove } = useMemoriesStore();
  const loadPeople = usePeopleStore((s) => s.loadAll);
  const peopleLen = usePeopleStore((s) => s.people.length);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    if (memories.length === 0) void load();
    if (peopleLen === 0) void loadPeople();
  }, [load, loadPeople, memories.length, peopleLen]);

  const thisDay = useMemo(() => onThisDay(memories), [memories]);

  return (
    <section className="animate-bloom">
      <header className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl">Memories</h1>
          <p className="text-charcoal-500 mt-1">Traditions, first times, ordinary days worth keeping.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAdd((v) => !v)}>
          {showAdd ? 'Close' : 'Add memory'}
        </button>
      </header>

      {showAdd && <div className="mb-6"><AddMemoryForm onDone={() => setShowAdd(false)} /></div>}

      {thisDay.length > 0 && (
        <div className="mb-6">
          <h2 className="font-serif text-2xl text-charcoal-900 mb-2">On this day</h2>
          <div className="space-y-3">
            {thisDay.map((m) => <MemoryCard key={m.id} memory={m} />)}
          </div>
        </div>
      )}

      {memories.length === 0 ? (
        <div className="card-journal text-center py-12">
          <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-cream-200" />
          <p className="text-charcoal-700">
            Add your first memory — a trip, a dinner, a moment worth keeping.
          </p>
          <button className="btn-primary mt-4" onClick={() => setShowAdd(true)}>
            Add a memory
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {memories
            .filter((m) => !thisDay.includes(m))
            .map((m) => (
              <MemoryCard key={m.id} memory={m} onDelete={() => void remove(m.id)} />
            ))}
        </div>
      )}
    </section>
  );
}
