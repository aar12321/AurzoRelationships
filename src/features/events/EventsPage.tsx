import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useEventsStore } from '@/stores/eventsStore';
import { EVENT_TYPE_LABELS } from '@/types/events';

export default function EventsPage() {
  const { events, load, loading } = useEventsStore();

  useEffect(() => { if (events.length === 0) void load(); }, [load, events.length]);

  const now = Date.now();
  const upcoming = events.filter((e) => !e.starts_at || new Date(e.starts_at).getTime() >= now);
  const past = events.filter((e) => e.starts_at && new Date(e.starts_at).getTime() < now);

  return (
    <section className="animate-bloom">
      <header className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl">Events</h1>
          <p className="text-charcoal-500 mt-1">
            From dinner to a reunion — plan it all in one place.
          </p>
        </div>
        <Link to="/relationships/events/new" className="btn-primary">Create event</Link>
      </header>

      {loading && events.length === 0 ? (
        <div className="card-journal text-sm text-charcoal-500">Loading…</div>
      ) : events.length === 0 ? (
        <div className="card-journal text-center py-12">
          <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-cream-200" />
          <p className="text-charcoal-700">
            Create your first event when you're ready.
          </p>
          <Link to="/relationships/events/new" className="btn-primary mt-4 inline-flex">
            Create an event
          </Link>
        </div>
      ) : (
        <>
          <Section title="Upcoming" events={upcoming} />
          {past.length > 0 && <Section title="Past" events={past} />}
        </>
      )}
    </section>
  );
}

function Section({ title, events }: { title: string; events: ReturnType<typeof useEventsStore.getState>['events'] }) {
  if (events.length === 0) return null;
  return (
    <div className="mb-6">
      <h2 className="font-serif text-2xl text-charcoal-900 mb-3">{title}</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {events.map((e) => (
          <Link key={e.id} to={`/relationships/events/${e.id}`}
            className="card-journal hover:-translate-y-0.5 transition-all block">
            <h3 className="font-serif text-2xl text-charcoal-900">{e.name}</h3>
            <div className="text-xs text-charcoal-500 mt-1">
              {e.event_type && EVENT_TYPE_LABELS[e.event_type]}
              {e.starts_at && <> · {new Date(e.starts_at).toLocaleDateString()}</>}
              {e.location && <> · {e.location}</>}
            </div>
            {e.notes && (
              <p className="text-sm text-charcoal-700 mt-3 line-clamp-2">{e.notes}</p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
