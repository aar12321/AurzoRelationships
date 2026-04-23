import { useEffect, useMemo, useState } from 'react';
import { useDatesStore } from '@/stores/datesStore';
import { useGiftsStore } from '@/stores/giftsStore';
import { usePeopleStore } from '@/stores/peopleStore';
import { upcomingWithin } from '@/services/datesService';
import { DATE_TYPE_EMOJI, daysUntil } from '@/types/dates';
import AddGiftIdeaForm from './AddGiftIdeaForm';
import GiftIdeaCard from './GiftIdeaCard';

export default function GiftHubPage() {
  const { dates, load: loadDates } = useDatesStore();
  const { ideas, load: loadGifts } = useGiftsStore();
  const { people, loadAll: loadPeople } = usePeopleStore();
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    void loadPeople(); void loadDates(); void loadGifts();
  }, [loadPeople, loadDates, loadGifts]);

  const upcomingGiftOccasions = useMemo(() => {
    return upcomingWithin(dates, 60).filter(
      (d) => d.date_type === 'birthday' || d.date_type === 'anniversary' || d.date_type === 'holiday',
    );
  }, [dates]);

  const nameFor = (id: string) =>
    people.find((p) => p.id === id)?.full_name ?? 'someone';

  return (
    <section className="animate-bloom">
      <header className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl">Gift hub</h1>
          <p className="text-charcoal-500 mt-1">
            Save ideas as they come. Never scramble again.
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowAdd((v) => !v)}>
          {showAdd ? 'Close' : 'Save an idea'}
        </button>
      </header>

      {showAdd && <div className="mb-6"><AddGiftIdeaForm onDone={() => setShowAdd(false)} /></div>}

      {upcomingGiftOccasions.length > 0 && (
        <div className="mb-8">
          <h2 className="font-serif text-2xl text-charcoal-900 mb-3">Coming up</h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {upcomingGiftOccasions.map((d) => {
              const personIdeas = d.person_id
                ? ideas.filter((i) => i.person_id === d.person_id).length
                : 0;
              return (
                <div key={d.id} className="card-journal">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{DATE_TYPE_EMOJI[d.date_type]}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-serif text-lg">{d.label}</div>
                      <div className="text-xs text-charcoal-500">
                        {d.person_id && nameFor(d.person_id)} · in {daysUntil(d)}d
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-charcoal-500 mt-3">
                    {personIdeas} saved idea{personIdeas === 1 ? '' : 's'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <h2 className="font-serif text-2xl text-charcoal-900 mb-3">Saved ideas</h2>
        {ideas.length === 0 ? (
          <div className="card-journal text-center py-12">
            <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-cream-200" />
            <p className="text-charcoal-700">
              Save an idea whenever one comes to mind — mid-conversation, while scrolling, anywhere.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {ideas.map((i) => (
              <GiftIdeaCard key={i.id} idea={i} showPerson={nameFor(i.person_id)} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
