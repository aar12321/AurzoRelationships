import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useGiftsStore } from '@/stores/giftsStore';
import { usePeopleStore } from '@/stores/peopleStore';
import AddGiftIdeaForm from './AddGiftIdeaForm';
import GiftIdeaCard from './GiftIdeaCard';
import { draftIdeas } from '@/services/giftsService';
import { aiGiftIdeas } from '@/services/aiService';
import { toast } from '@/stores/toastStore';

type AiIdea = { title: string; reason: string; estimated_cost?: number };

export default function PersonGiftsPage() {
  const { id } = useParams();
  const people = usePeopleStore((s) => s.people);
  const loadPeople = usePeopleStore((s) => s.loadAll);
  // Narrow store subscription: select each slice individually so an
  // unrelated store update (e.g. a different person's add) doesn't
  // re-render this page.
  const ideas = useGiftsStore((s) => s.ideas);
  const given = useGiftsStore((s) => s.given);
  const load = useGiftsStore((s) => s.load);
  const addIdea = useGiftsStore((s) => s.addIdea);
  const [showAdd, setShowAdd] = useState(false);
  const [aiIdeas, setAiIdeas] = useState<AiIdea[] | null>(null);
  const [aiBusy, setAiBusy] = useState(false);

  useEffect(() => {
    if (people.length === 0) void loadPeople();
    if (ideas.length === 0 && given.length === 0) void load();
  }, [loadPeople, load, people.length, ideas.length, given.length]);

  const person = people.find((p) => p.id === id);

  // Memoize the per-person filters so toggling unrelated state on the
  // page (or other gift-store updates for a different person) doesn't
  // re-walk the full ideas/given arrays on every render.
  const personIdeas = useMemo(
    () => (person ? ideas.filter((i) => i.person_id === person.id) : []),
    [ideas, person?.id],
  );
  const personGiven = useMemo(
    () => (person ? given.filter((g) => g.person_id === person.id) : []),
    [given, person?.id],
  );
  const suggestions = useMemo(
    () => (person
      ? draftIdeas(
          person.full_name.split(' ')[0],
          person.notes ?? person.life_context?.job ?? '',
        )
      : []),
    [person?.id, person?.full_name, person?.notes, person?.life_context?.job],
  );

  if (!person) return <div className="text-charcoal-500 text-sm">Loading…</div>;

  // TS doesn't preserve the `!person` narrow into function declarations —
  // capture a non-null alias so the handlers below don't need their own guards.
  const p = person;

  async function fetchAi() {
    setAiBusy(true);
    try {
      const got = await aiGiftIdeas(p);
      setAiIdeas(got);
      toast.success(`${got.length} ideas drafted for ${p.full_name.split(' ')[0]}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not draft ideas.');
    } finally {
      setAiBusy(false);
    }
  }

  async function saveIdea(idea: AiIdea | { title: string; reason: string }) {
    try {
      await addIdea({
        person_id: p.id,
        title: idea.title,
        reason: idea.reason,
        source: 'ai',
      }, p.owner_id);
      toast.success('Saved to their idea list.');
    } catch {
      toast.error('Could not save.');
    }
  }

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
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <h2 className="font-serif text-xl text-charcoal-900 dark:text-cream-50">
                {aiIdeas ? 'Ideas from Claude' : 'A few warm starting points'}
              </h2>
              <p className="text-xs text-charcoal-500 dark:text-charcoal-300 mt-1">
                {aiIdeas
                  ? `Tailored to what we know about ${person.full_name.split(' ')[0]}. Save the ones that feel right.`
                  : `Generic starters — click "Ask Claude" for ideas tailored to ${person.full_name.split(' ')[0]}.`}
              </p>
            </div>
            <button
              onClick={() => void fetchAi()}
              disabled={aiBusy}
              className="btn-primary text-xs shrink-0"
            >
              {aiBusy ? 'Drafting…' : aiIdeas ? 'Refresh' : '✨ Ask Claude'}
            </button>
          </div>
          <div className="space-y-2">
            {(aiIdeas ?? suggestions).map((s, i) => (
              <div key={i} className="flex items-start gap-3 p-2 rounded-journal
                                      hover:bg-cream-100 dark:hover:bg-charcoal-800 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{s.title}</div>
                  <div className="text-xs text-charcoal-500 dark:text-charcoal-300">{s.reason}</div>
                </div>
                <button className="btn-ghost text-xs"
                  onClick={() => void saveIdea(s)}>
                  Save
                </button>
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
