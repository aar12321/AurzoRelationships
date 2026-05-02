// Today — a unified daily feed. Merges notifications, upcoming dates,
// fading relationships, and active streaks into a single prioritized list.
// This complements the Dashboard (snapshot) with a chronological timeline.

import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { usePeopleStore } from '@/stores/peopleStore';
import { useDatesStore } from '@/stores/datesStore';
import { useInteractionsStore } from '@/stores/interactionsStore';
import { useNotificationsStore } from '@/stores/notificationsStore';
import { composeToday, type TodayItem } from '@/services/todayFeedService';

export default function TodayPage() {
  const people = usePeopleStore((s) => s.people);
  const loadPeople = usePeopleStore((s) => s.loadAll);
  const dates = useDatesStore((s) => s.dates);
  const loadDates = useDatesStore((s) => s.load);
  const interactions = useInteractionsStore((s) => s.interactions);
  const loadIx = useInteractionsStore((s) => s.load);
  const notifications = useNotificationsStore((s) => s.items);
  const loadNotifs = useNotificationsStore((s) => s.load);

  useEffect(() => {
    if (people.length === 0) void loadPeople();
    if (dates.length === 0) void loadDates();
    if (interactions.length === 0) void loadIx();
    void loadNotifs();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const items = useMemo(
    () => composeToday({ people, dates, interactions, notifications }),
    [people, dates, interactions, notifications],
  );

  const greeting = greetingFor(new Date());
  const todayLabel = new Date().toLocaleDateString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  return (
    <section className="animate-bloom">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-wider text-charcoal-500 dark:text-charcoal-300">
          {todayLabel}
        </p>
        <h1 className="text-4xl">{greeting}</h1>
        <p className="text-charcoal-500 dark:text-charcoal-300 mt-1">
          {items.length === 0
            ? "A quiet day. Nothing pressing."
            : `${items.length} ${items.length === 1 ? 'thing' : 'things'} worth noticing.`}
        </p>
      </header>

      {items.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="space-y-3">
          {items.map((it, i) => (
            <TodayRow key={it.id} item={it} index={i} />
          ))}
        </ul>
      )}

      <QuickCapture />
    </section>
  );
}

function QuickCapture() {
  // The morning-ritual launchpad. Five small affordances so the user can
  // act on whatever they noticed above without hunting through the nav.
  return (
    <section aria-labelledby="qc-heading" className="mt-8">
      <h2 id="qc-heading"
          className="text-xs uppercase tracking-wider text-charcoal-500
                     dark:text-charcoal-300 mb-2">
        While you're here
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <QcLink to="/relationships/people" icon="👋" label="Reach out" />
        <QcLink to="/relationships/memories" icon="📸" label="Capture a memory" />
        <QcLink to="/relationships/dates" icon="📅" label="Add a date" />
        <QcLink to="/relationships/gifts" icon="🎁" label="Gift idea" />
        <QcLink to="/relationships/advisor" icon="✨" label="Ask the advisor" />
      </div>
    </section>
  );
}

function QcLink({ to, icon, label }: { to: string; icon: string; label: string }) {
  return (
    <Link to={to}
      className="card-journal flex flex-col items-center justify-center gap-1
                 py-3 text-center hover:translate-y-[-1px] transition-transform">
      <span className="text-2xl leading-none" aria-hidden>{icon}</span>
      <span className="text-xs text-charcoal-700 dark:text-cream-100">{label}</span>
    </Link>
  );
}

function TodayRow({ item, index }: { item: TodayItem; index: number }) {
  const body = (
    <div className="card-journal flex items-start gap-3 hover:translate-y-[-1px]
                    transition-transform">
      <div className="text-2xl leading-none mt-0.5" aria-hidden>{item.icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-serif text-lg text-charcoal-900 dark:text-cream-50 truncate">
            {item.title}
          </h3>
          {item.timestamp && (
            <span className="text-xs text-charcoal-500 dark:text-charcoal-300 shrink-0">
              {item.timestamp}
            </span>
          )}
        </div>
        <p className="text-sm text-charcoal-700 dark:text-cream-100 mt-1">{item.body}</p>
        {item.hint && (
          <span className="chip mt-2 text-[10px]">{item.hint}</span>
        )}
      </div>
      <KindStripe kind={item.kind} />
    </div>
  );
  const content = (
    <div className="animate-bloom" style={{ animationDelay: `${index * 30}ms` }}>
      {body}
    </div>
  );
  return <li>{item.to ? <Link to={item.to} className="block">{content}</Link> : content}</li>;
}

function KindStripe({ kind }: { kind: TodayItem['kind'] }) {
  const color =
    kind === 'date_today' ? 'bg-terracotta-500'
    : kind === 'notification' ? 'bg-gold-500'
    : kind === 'date_soon' ? 'bg-terracotta-300'
    : kind === 'fading' ? 'bg-charcoal-500'
    : 'bg-gold-300';
  return <span className={`w-1 rounded-full self-stretch ${color}`} aria-hidden />;
}

function EmptyState() {
  return (
    <div className="card-journal text-center py-10">
      <div className="text-4xl mb-3">🌿</div>
      <h3 className="font-serif text-2xl mb-2">Nothing urgent today.</h3>
      <p className="text-charcoal-500 dark:text-charcoal-300 mb-4">
        Quiet days are a good time to reach out, not react. Who crossed your mind recently?
      </p>
      <div className="flex justify-center gap-3">
        <Link to="/relationships/people" className="btn-primary">Browse people</Link>
        <Link to="/relationships/advisor" className="btn-ghost">Ask the advisor</Link>
      </div>
    </div>
  );
}

function greetingFor(d: Date): string {
  const h = d.getHours();
  if (h < 5)  return 'Still up.';
  if (h < 12) return 'Good morning.';
  if (h < 17) return 'Good afternoon.';
  if (h < 21) return 'Good evening.';
  return 'Winding down.';
}
