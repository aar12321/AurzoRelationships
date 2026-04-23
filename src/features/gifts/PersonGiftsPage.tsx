import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useGiftsStore } from '@/stores/giftsStore';
import { usePeopleStore } from '@/stores/peopleStore';
import AddGiftIdeaForm from './AddGiftIdeaForm';
import GiftIdeaCard from './GiftIdeaCard';
import { draftIdeas } from '@/services/giftsService';

export default function PersonGiftsPage() {
  const { id } = useParams();
  const people = usePeopleStore((s) => s.people);
  const loadPeople = usePeopleStore((s) => s.loadAll);
  const { ideas, given, load, addIdea } = useGiftsStore();
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    if (people.length === 0) void loadPeople();
    if (ideas.length === 0 && given.length === 0) void load();
  }, [loadPeople, load, people.length, ideas.length, given.length]);

  const person = people.find((p) => p.id === id);
  if (!person) return <div className="text-charcoal-500 text-sm">Loading…</div>;

  const personIdeas = ideas.filter((i) => i.person_id === person.id);
  const personGiven = given.filter((g) => g.person_id === person.id);
  const suggestions = draftIdeas(
    person.full_name.split(' ')[0],
    person.notes ?? person.life_context?.job ?? '',
  );

  return (
    <section className="animate-bloom">
      <Link to={`/relationships/people/${person.id}`} className="text-xs text-charcoal-500">
        ← {person.full_name}
      </Link>
      <header className="mb-6 mt-1 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl">Gifts for {person.full_name.split(' ')[0]}</h1>
          <p className="text-charcoal-500 mt-1">Ideas, history, and a few warm starting points.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAdd((v) => !v)}>
          {showAdd ? 'Close' : 'Save idea'}
        </button>
      </header>

      {showAdd && (
        <div className="mb-6">
          <AddGiftIdeaForm personId={person.id} onDone={() => setShowAdd(false)} />
        </div>
      )}

      {personIdeas.length === 0 && (
        <div className="card-journal mb-6">
          <h2 className="font-serif text-xl text-charcoal-900 mb-3">A few warm starting points</h2>
          <p className="text-xs text-charcoal-500 mb-3">
            These are generic — they'll get much better once you tell Aurzo what they love.
          </p>
          <div className="space-y-2">
            {suggestions.map((s, i) => (
              <div key={i} className="flex items-start gap-3 p-2 rounded-journal hover:bg-cream-100">
                <div className="flex-1">
                  <div className="font-medium">{s.title}</div>
                  <div className="text-xs text-charcoal-500">{s.reason}</div>
                </div>
                <button className="btn-ghost text-xs" onClick={() => {
                  void addIdea({
                    person_id: person.id, title: s.title, reason: s.reason, source: 'ai',
                  }, person.owner_id);
                }}>Save</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <h2 className="font-serif text-2xl text-charcoal-900 mb-3">Ideas</h2>
      {personIdeas.length === 0 ? (
        <div className="card-journal text-sm text-charcoal-500">No ideas yet.</div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {personIdeas.map((i) => <GiftIdeaCard key={i.id} idea={i} />)}
        </div>
      )}

      {personGiven.length > 0 && (
        <>
          <h2 className="font-serif text-2xl text-charcoal-900 mt-8 mb-3">History</h2>
          <div className="card-journal">
            {personGiven.map((g) => (
              <div key={g.id} className="py-2 border-b border-cream-200 last:border-0">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{g.title}</div>
                  <div className="text-xs text-charcoal-500">{g.given_on}</div>
                </div>
                {g.occasion && <div className="text-xs text-charcoal-500">{g.occasion}</div>}
                {g.reaction && <div className="text-sm text-charcoal-700 mt-1">"{g.reaction}"</div>}
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
