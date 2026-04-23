import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useInteractionsStore } from '@/stores/interactionsStore';
import { usePeopleStore } from '@/stores/peopleStore';
import { computeStrength } from '@/services/interactionsService';
import type { Strength } from '@/types/people';
import { STRENGTH_LABELS } from '@/types/people';
import PersonAvatar from '@/features/people/PersonAvatar';
import StrengthDot from '@/features/people/StrengthDot';
import LogInteractionForm from './LogInteractionForm';

const BUCKETS: Strength[] = ['thriving', 'active', 'fading', 'dormant', 'unknown'];

export default function HealthPage() {
  const people = usePeopleStore((s) => s.people);
  const loadPeople = usePeopleStore((s) => s.loadAll);
  const { interactions, load: loadIx } = useInteractionsStore();
  const [showLog, setShowLog] = useState(false);

  useEffect(() => {
    if (people.length === 0) void loadPeople();
    if (interactions.length === 0) void loadIx();
  }, [loadPeople, loadIx, people.length, interactions.length]);

  const byBucket = useMemo(() => {
    const out: Record<Strength, typeof people> = {
      thriving: [], active: [], fading: [], dormant: [], unknown: [],
    };
    for (const p of people) out[computeStrength(p, interactions)].push(p);
    return out;
  }, [people, interactions]);

  const reachOut = [...byBucket.fading, ...byBucket.dormant].slice(0, 5);

  return (
    <section className="animate-bloom">
      <header className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl">Relationship health</h1>
          <p className="text-charcoal-500 mt-1">
            A gentle view — no scores, just how things feel.
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowLog((v) => !v)}>
          {showLog ? 'Close' : 'Log interaction'}
        </button>
      </header>

      {showLog && (
        <div className="mb-6"><LogInteractionForm onDone={() => setShowLog(false)} /></div>
      )}

      {reachOut.length > 0 && (
        <div className="card-journal mb-6 bg-gold-300/20 border-gold-500">
          <h2 className="font-serif text-xl text-charcoal-900 mb-2">
            Reach-out queue
          </h2>
          <p className="text-sm text-charcoal-500 mb-3">
            These people have drifted a little. No pressure — pick one if it feels right.
          </p>
          <div className="space-y-2">
            {reachOut.map((p) => (
              <Link key={p.id} to={`/relationships/people/${p.id}`}
                className="flex items-center gap-3 p-2 rounded-journal hover:bg-ivory-50">
                <PersonAvatar name={p.full_name} photoUrl={p.photo_url} size="sm" />
                <div className="flex-1">
                  <div className="text-charcoal-900">{p.full_name}</div>
                  <div className="text-xs text-charcoal-500">
                    {STRENGTH_LABELS[computeStrength(p, interactions)]}
                  </div>
                </div>
                <StrengthDot strength={computeStrength(p, interactions)} />
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-6">
        {BUCKETS.map((s) =>
          byBucket[s].length === 0 ? null : (
            <div key={s}>
              <div className="flex items-baseline gap-3 mb-2">
                <StrengthDot strength={s} />
                <h2 className="font-serif text-2xl text-charcoal-900">
                  {STRENGTH_LABELS[s]}
                </h2>
                <span className="text-xs text-charcoal-500">
                  {byBucket[s].length} {byBucket[s].length === 1 ? 'person' : 'people'}
                </span>
              </div>
              <div className="card-journal">
                {byBucket[s].map((p) => (
                  <Link key={p.id} to={`/relationships/people/${p.id}`}
                    className="flex items-center gap-3 py-2 border-b border-cream-200
                               last:border-0 hover:bg-cream-100 px-2 rounded-journal">
                    <PersonAvatar name={p.full_name} photoUrl={p.photo_url} size="sm" />
                    <span className="flex-1 text-charcoal-900">{p.full_name}</span>
                    <span className="text-xs text-charcoal-500">
                      {p.last_contacted_at
                        ? new Date(p.last_contacted_at).toLocaleDateString()
                        : '—'}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          ),
        )}
        {people.length === 0 && (
          <div className="card-journal text-center py-12">
            <p className="text-charcoal-700">
              Add a few people first — this view lights up when you have relationships to track.
            </p>
            <Link to="/relationships/people/new" className="btn-primary mt-4 inline-flex">
              Add someone
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
