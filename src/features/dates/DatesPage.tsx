import { useEffect, useMemo, useState } from 'react';
import { useDatesStore } from '@/stores/datesStore';
import { usePeopleStore } from '@/stores/peopleStore';
import {
  recentlyPassed, sortByUpcoming, upcomingWithin,
} from '@/services/datesService';
import DateRow from './DateRow';
import AddDateForm from './AddDateForm';

export default function DatesPage() {
  const { dates, loading, load, remove } = useDatesStore();
  const loadPeople = usePeopleStore((s) => s.loadAll);
  const peopleLen = usePeopleStore((s) => s.people.length);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    if (dates.length === 0) void load();
    if (peopleLen === 0) void loadPeople();
  }, [load, loadPeople, dates.length, peopleLen]);

  const upcoming = useMemo(() => upcomingWithin(dates, 31), [dates]);
  const later = useMemo(
    () => sortByUpcoming(dates).filter((d) => !upcoming.includes(d)),
    [dates, upcoming],
  );
  const passed = useMemo(() => recentlyPassed(dates, 7), [dates]);

  return (
    <section className="animate-bloom">
      <header className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl">Important dates</h1>
          <p className="text-charcoal-500 mt-1">
            Never miss a moment that matters to someone you love.
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowAdd((v) => !v)}>
          {showAdd ? 'Close' : 'Add date'}
        </button>
      </header>

      {showAdd && (
        <div className="mb-6"><AddDateForm onDone={() => setShowAdd(false)} /></div>
      )}

      {loading && dates.length === 0 ? (
        <div className="card-journal text-charcoal-500 text-sm">Loading…</div>
      ) : dates.length === 0 ? (
        <div className="card-journal text-center py-12">
          <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-cream-200" />
          <p className="text-charcoal-700">
            Add a birthday or anniversary — we'll remind you gently, in advance.
          </p>
          <button className="btn-primary mt-4" onClick={() => setShowAdd(true)}>
            Add your first date
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {passed.length > 0 && (
            <Section title="Recently passed" hint="It's not too late to reach out.">
              {passed.map((d) => (
                <DateRow key={d.id} date={d} onDelete={() => void remove(d.id)} />
              ))}
            </Section>
          )}
          {upcoming.length > 0 && (
            <Section title="Coming up" hint="Within the next month.">
              {upcoming.map((d) => (
                <DateRow key={d.id} date={d} onDelete={() => void remove(d.id)} />
              ))}
            </Section>
          )}
          {later.length > 0 && (
            <Section title="Later">
              {later.map((d) => (
                <DateRow key={d.id} date={d} onDelete={() => void remove(d.id)} />
              ))}
            </Section>
          )}
        </div>
      )}
    </section>
  );
}

function Section({
  title, hint, children,
}: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline gap-3 mb-2">
        <h2 className="font-serif text-2xl text-charcoal-900">{title}</h2>
        {hint && <p className="text-xs text-charcoal-500">{hint}</p>}
      </div>
      <div className="card-journal">{children}</div>
    </div>
  );
}
