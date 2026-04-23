// Health Forecast — projects where every close relationship is heading
// over the next 90 days if nothing changes.
//
// Two panels:
//   1. Projection timeline — horizontal bars per close person; each bar
//      runs from today to the day they'll cross into "dormant" based on
//      fading_threshold_days. Already-dormant people get a tiny red tag
//      at day 0.
//   2. Active streaks — celebrates consecutive-day contact streaks in
//      the last 30 days.
//
// Everything is derived from peopleStore + interactionsStore; no new
// server calls.

import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { usePeopleStore } from '@/stores/peopleStore';
import { useInteractionsStore } from '@/stores/interactionsStore';
import {
  forecastAll, STRENGTH_COLOR, urgencyOf, type PersonForecast,
} from '@/services/forecastService';

const HORIZON = 90;
const CLOSE_TYPES = new Set(['partner', 'spouse', 'family', 'close_friend']);

export default function ForecastPage() {
  const people = usePeopleStore((s) => s.people);
  const loadPeople = usePeopleStore((s) => s.loadAll);
  const interactions = useInteractionsStore((s) => s.interactions);
  const loadIx = useInteractionsStore((s) => s.load);

  useEffect(() => {
    if (people.length === 0) void loadPeople();
    if (interactions.length === 0) void loadIx();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const forecasts = useMemo(() => forecastAll(people, interactions), [people, interactions]);

  const closeSorted = useMemo(
    () => forecasts
      .filter((f) => CLOSE_TYPES.has(f.person.relationship_type ?? ''))
      .sort((a, b) => urgencyOf(b) - urgencyOf(a))
      .slice(0, 12),
    [forecasts],
  );

  const streaks = useMemo(
    () => forecasts
      .filter((f) => f.currentStreakDays >= 2 || f.longestStreak30 >= 3)
      .sort((a, b) => b.currentStreakDays - a.currentStreakDays)
      .slice(0, 8),
    [forecasts],
  );

  return (
    <section className="animate-bloom">
      <header className="mb-6">
        <h1 className="text-4xl">Forecast.</h1>
        <p className="text-charcoal-500 dark:text-charcoal-300 mt-1">
          Where your closest relationships are heading if nothing changes.
          Reach out when a bar starts to shrink.
        </p>
      </header>

      {people.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-6">
          <div className="card-journal">
            <h2 className="text-xs uppercase tracking-wider text-charcoal-500 dark:text-charcoal-300 mb-3">
              90-day projection
            </h2>
            {closeSorted.length === 0 ? (
              <p className="text-sm text-charcoal-500 dark:text-charcoal-300 py-6 text-center">
                Add a close friend or family member and we'll project their drift here.
              </p>
            ) : (
              <TimelineChart items={closeSorted} />
            )}
          </div>

          <div className="card-journal">
            <h2 className="text-xs uppercase tracking-wider text-charcoal-500 dark:text-charcoal-300 mb-3">
              Streaks worth celebrating
            </h2>
            {streaks.length === 0 ? (
              <p className="text-sm text-charcoal-500 dark:text-charcoal-300 py-4">
                No active streaks yet — the easiest way to start one is to log a quick
                check-in today. Two days in a row counts.
              </p>
            ) : (
              <ul className="divide-y divide-cream-200 dark:divide-charcoal-700">
                {streaks.map((s) => <StreakRow key={s.person.id} f={s} />)}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function TimelineChart({ items }: { items: PersonForecast[] }) {
  const maxName = Math.min(180, Math.max(...items.map((f) => f.person.full_name.length * 8 + 12)));
  return (
    <div className="space-y-2">
      <div className="flex text-[10px] text-charcoal-500 dark:text-charcoal-300"
           style={{ paddingLeft: maxName + 12 }}>
        <span className="flex-1">Today</span>
        <span>30d</span>
        <span className="mx-6">60d</span>
        <span>90d</span>
      </div>
      {items.map((f) => <TimelineRow key={f.person.id} f={f} nameWidth={maxName} />)}
    </div>
  );
}

function TimelineRow({ f, nameWidth }: { f: PersonForecast; nameWidth: number }) {
  const pctUntilDormant = Math.min(100, (f.daysUntilDormant / HORIZON) * 100);
  const color = STRENGTH_COLOR[f.currentStrength];
  const already = f.daysUntilDormant === 0;

  return (
    <Link to={`/relationships/people/${f.person.id}`}
      className="flex items-center gap-3 py-1.5 -mx-2 px-2 rounded-journal
                 hover:bg-cream-50 dark:hover:bg-charcoal-800 transition-colors">
      <span className="text-sm text-charcoal-900 dark:text-cream-50 truncate"
            style={{ width: nameWidth }}>
        {f.person.full_name}
      </span>
      <div className="flex-1 relative h-4 rounded-full overflow-hidden
                      bg-cream-100 dark:bg-charcoal-800">
        {!already && (
          <div className="absolute inset-y-0 left-0 rounded-full transition-all"
               style={{ width: `${pctUntilDormant}%`, backgroundColor: color, opacity: 0.85 }} />
        )}
        {already && (
          <div className="absolute inset-y-0 left-0 rounded-full px-2
                          flex items-center text-[10px] text-ivory-50"
               style={{ backgroundColor: '#8f4c2f' }}>
            Dormant
          </div>
        )}
      </div>
      <span className="text-xs text-charcoal-500 dark:text-charcoal-300 w-20 text-right shrink-0">
        {already ? '—'
          : f.daysUntilDormant <= 7  ? `${f.daysUntilDormant}d · soon`
          : f.daysUntilDormant <= 30 ? `${f.daysUntilDormant}d`
          : `${f.daysUntilDormant}d ahead`}
      </span>
    </Link>
  );
}

function StreakRow({ f }: { f: PersonForecast }) {
  return (
    <li className="py-2 flex items-center justify-between gap-3">
      <Link to={`/relationships/people/${f.person.id}`}
        className="text-sm text-charcoal-900 dark:text-cream-50 hover:underline truncate">
        {f.person.full_name}
      </Link>
      <div className="flex items-center gap-3 text-xs">
        {f.currentStreakDays >= 2 && (
          <span className="chip text-[11px]">
            ✨ {f.currentStreakDays}-day streak
          </span>
        )}
        {f.longestStreak30 >= 3 && f.longestStreak30 !== f.currentStreakDays && (
          <span className="text-charcoal-500 dark:text-charcoal-300">
            best 30d: {f.longestStreak30}
          </span>
        )}
      </div>
    </li>
  );
}

function EmptyState() {
  return (
    <div className="card-journal text-center py-10">
      <div className="text-4xl mb-3">📈</div>
      <h3 className="font-serif text-2xl mb-2">Forecast awaits.</h3>
      <p className="text-charcoal-500 dark:text-charcoal-300">
        Once you've added a few people and logged some interactions, this page
        will show how your closest relationships are trending.
      </p>
    </div>
  );
}
