import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useDatesStore } from '@/stores/datesStore';
import { useInteractionsStore } from '@/stores/interactionsStore';
import { usePeopleStore } from '@/stores/peopleStore';
import { useNotificationsStore } from '@/stores/notificationsStore';
import { aiSurfacePulse } from '@/services/aiService';
import { upcomingWithin } from '@/services/datesService';
import { computeStrength } from '@/services/interactionsService';
import { DATE_TYPE_EMOJI, daysUntil } from '@/types/dates';
import PersonAvatar from '@/features/people/PersonAvatar';
import StrengthDot from '@/features/people/StrengthDot';

export default function Dashboard() {
  const { user } = useAuthStore();
  const { people, loadAll: loadPeople } = usePeopleStore();
  const { dates, load: loadDates } = useDatesStore();
  const { interactions, load: loadIx } = useInteractionsStore();
  const loadNotifs = useNotificationsStore((s) => s.load);
  const name = user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? 'friend';
  const [pulseBusy, setPulseBusy] = useState(false);
  const [pulseMsg, setPulseMsg] = useState<string | null>(null);

  async function surfacePulse() {
    if (pulseBusy) return;
    setPulseBusy(true); setPulseMsg(null);
    try {
      await aiSurfacePulse(people, dates);
      await loadNotifs();
      setPulseMsg('Pulse delivered — check your bell.');
    } catch (e) {
      setPulseMsg(e instanceof Error ? e.message : 'Could not generate pulse');
    } finally {
      setPulseBusy(false);
      setTimeout(() => setPulseMsg(null), 4000);
    }
  }

  useEffect(() => {
    if (people.length === 0) void loadPeople();
    if (dates.length === 0) void loadDates();
    if (interactions.length === 0) void loadIx();
  }, [loadPeople, loadDates, loadIx, people.length, dates.length, interactions.length]);

  const upcoming = useMemo(() => upcomingWithin(dates, 31).slice(0, 5), [dates]);

  const fading = useMemo(() => {
    return people
      .map((p) => ({ p, s: computeStrength(p, interactions) }))
      .filter((x) => x.s === 'fading' || x.s === 'dormant')
      .slice(0, 3);
  }, [people, interactions]);

  // Weekly pulse — pick the one fading person whose "goal" is maintain or deepen.
  const pulse = useMemo(() => {
    const candidate = fading.find(
      (f) => f.p.relationship_goal === 'maintain' || f.p.relationship_goal === 'deepen',
    ) ?? fading[0];
    return candidate?.p ?? null;
  }, [fading]);

  return (
    <section className="animate-bloom">
      <header className="mb-8">
        <h1 className="text-4xl">Hello, {name}</h1>
        <p className="text-charcoal-500 mt-1">
          A quiet place for the people who matter most.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card title="Reach-out queue">
          {fading.length === 0 ? (
            <p className="text-charcoal-700">Everyone's in a good rhythm. Appreciate it.</p>
          ) : (
            <ul className="space-y-2">
              {fading.map(({ p, s }) => (
                <li key={p.id}>
                  <Link to={`/relationships/people/${p.id}`}
                    className="flex items-center gap-2 rounded p-1 hover:bg-cream-100">
                    <PersonAvatar name={p.full_name} photoUrl={p.photo_url} size="sm" />
                    <span className="flex-1 text-sm">{p.full_name}</span>
                    <StrengthDot strength={s} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Upcoming dates">
          {upcoming.length === 0 ? (
            <p className="text-charcoal-700">Add a birthday or anniversary to see this come alive.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {upcoming.map((d) => (
                <li key={d.id} className="flex items-center gap-2">
                  <span>{DATE_TYPE_EMOJI[d.date_type]}</span>
                  <span className="flex-1 truncate">{d.label}</span>
                  <span className="text-xs text-charcoal-500">
                    {daysUntil(d) === 0 ? 'today' : `${daysUntil(d)}d`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Weekly pulse">
          {pulse ? (
            <div>
              <p className="text-charcoal-700 text-sm">
                One person worth nurturing this week:
              </p>
              <Link to={`/relationships/people/${pulse.id}`}
                className="mt-2 flex items-center gap-2 p-2 rounded-journal hover:bg-cream-100">
                <PersonAvatar name={pulse.full_name} photoUrl={pulse.photo_url} size="sm" pulse />
                <span className="font-serif text-lg">{pulse.full_name}</span>
              </Link>
              <div className="flex flex-wrap gap-2 mt-3">
                <Link to={`/relationships/people/${pulse.id}/messages`}
                  className="btn-primary text-xs">
                  Draft a message
                </Link>
                <button onClick={() => void surfacePulse()} disabled={pulseBusy}
                  className="btn-ghost text-xs border border-cream-200">
                  {pulseBusy ? 'Thinking…' : 'Ask Claude for a pulse'}
                </button>
              </div>
              {pulseMsg && <p className="text-xs text-gold-700 mt-2">{pulseMsg}</p>}
            </div>
          ) : (
            <>
              <p className="text-charcoal-700">
                On Sunday mornings, one person worth nurturing will surface here.
              </p>
              {people.length > 0 && (
                <button onClick={() => void surfacePulse()} disabled={pulseBusy}
                  className="btn-primary text-xs mt-3">
                  {pulseBusy ? 'Thinking…' : 'Generate pulse now'}
                </button>
              )}
              {pulseMsg && <p className="text-xs text-gold-700 mt-2">{pulseMsg}</p>}
            </>
          )}
        </Card>
      </div>

      <section>
        <div className="flex items-end justify-between mb-3">
          <h2 className="font-serif text-2xl text-charcoal-900">Recently added</h2>
          <Link to="/relationships/people" className="btn-ghost">See all</Link>
        </div>
        {people.length === 0 ? (
          <div className="card-journal text-center py-10">
            <p className="text-charcoal-700">
              Start with one person who's been on your mind.
            </p>
            <Link to="/relationships/people/new" className="btn-primary mt-4 inline-flex">
              Add someone
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...people]
              .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
              .slice(0, 3)
              .map((p, i) => (
                <Link key={p.id} to={`/relationships/people/${p.id}`}
                  className="card-journal hover:-translate-y-0.5 transition-all animate-bloom block"
                  style={{ animationDelay: `${i * 40}ms` }}>
                  <div className="flex items-center gap-3">
                    <PersonAvatar name={p.full_name} photoUrl={p.photo_url} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="font-serif text-lg truncate">{p.full_name}</div>
                      <StrengthDot strength={computeStrength(p, interactions)} withLabel />
                    </div>
                  </div>
                </Link>
              ))}
          </div>
        )}
      </section>
    </section>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card-journal">
      <div className="text-xs uppercase tracking-wide text-gold-700">{title}</div>
      <div className="mt-2">{children}</div>
    </div>
  );
}
