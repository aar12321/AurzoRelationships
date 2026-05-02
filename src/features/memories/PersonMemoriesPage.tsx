import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { usePeopleStore } from '@/stores/peopleStore';
import { deleteMemory, listMemories } from '@/services/memoriesService';
import { toast } from '@/stores/toastStore';
import type { Memory } from '@/types/memories';
import AddMemoryForm from './AddMemoryForm';
import MemoryCard from './MemoryCard';

export default function PersonMemoriesPage() {
  const { id } = useParams();
  const people = usePeopleStore((s) => s.people);
  const loadPeople = usePeopleStore((s) => s.loadAll);
  const [memories, setMemories] = useState<Memory[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => { if (people.length === 0) void loadPeople(); }, [loadPeople, people.length]);

  // Stable refetch we can call after a memory is added — keeps load logic
  // out of the dependency array so toggling the "Add memory" panel doesn't
  // re-fire the list query on every open/close.
  const refetch = useCallback((personId: string) => {
    let cancelled = false;
    listMemories(personId)
      .then((rows) => { if (!cancelled) { setMemories(rows); setLoadError(null); } })
      .catch((e) => {
        if (cancelled) return;
        setLoadError(e instanceof Error ? e.message : 'Could not load memories.');
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!id) return;
    return refetch(id);
  }, [id, refetch]);

  const person = people.find((p) => p.id === id);
  if (!person) return <div className="text-charcoal-500 text-sm">Loading…</div>;

  async function handleDelete(memoryId: string) {
    if (!confirm('Delete this memory? This cannot be undone.')) return;
    const prev = memories;
    setMemories((cur) => (cur ?? []).filter((m) => m.id !== memoryId));
    try {
      await deleteMemory(memoryId);
      toast.success('Memory deleted');
    } catch (err) {
      setMemories(prev);
      toast.error(err instanceof Error ? err.message : 'Could not delete memory');
    }
  }

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
          <AddMemoryForm personId={person.id} onDone={() => {
            setShowAdd(false);
            refetch(person.id);
          }} />
        </div>
      )}

      {loadError ? (
        <div className="card-journal text-sm text-terracotta-700 dark:text-terracotta-300">
          {loadError} <button className="underline ml-2"
            onClick={() => refetch(person.id)}>Retry</button>
        </div>
      ) : !memories ? (
        <div className="text-charcoal-500 text-sm">Loading…</div>
      ) : memories.length === 0 ? (
        <div className="card-journal text-center py-12">
          <p className="text-charcoal-700">No memories yet. Capture one — even something small.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {memories.map((m) => (
            <MemoryCard key={m.id} memory={m} onDelete={() => void handleDelete(m.id)} />
          ))}
        </div>
      )}
    </section>
  );
}
