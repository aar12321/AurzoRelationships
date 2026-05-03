// GiftHub — the gift shopper. Walkthrough spec: "shopper helper"
// experience. Pick who it's for (or land here from a profile with
// ?for=:id), set a budget, optionally add extra interests + occasion,
// generate AI ideas with the full person context loaded. Each idea
// can be saved, opened in a shopping search, thumbed-up ("more like
// this"), or thumbed-down ("less like this") — both feed back into
// the next generation. A "Saved ideas" section at the bottom shows
// what's already in your bank.

import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useDatesStore } from '@/stores/datesStore';
import { useGiftsStore } from '@/stores/giftsStore';
import { usePeopleStore } from '@/stores/peopleStore';
import { aiGiftIdeasShopper } from '@/services/aiService';
import { friendlyError } from '@/services/friendlyError';
import { upcomingWithin } from '@/services/datesService';
import { toast } from '@/stores/toastStore';
import GiftIdeaCard from './GiftIdeaCard';
import BudgetSnapshot from './BudgetSnapshot';

type AiIdea = { title: string; reason: string; estimated_cost?: number };

const BUDGET_PRESETS = [25, 50, 100, 200] as const;
const OCCASIONS = ['birthday', 'anniversary', 'holiday', 'thank you', 'just because'];

export default function GiftHubPage() {
  const { user } = useAuthStore();
  const [params, setParams] = useSearchParams();
  const { people, loadAll: loadPeople } = usePeopleStore();
  const { ideas, given, load: loadGifts, addIdea } = useGiftsStore();
  const { dates, load: loadDates } = useDatesStore();

  useEffect(() => {
    void loadPeople(); void loadDates(); void loadGifts();
  }, [loadPeople, loadDates, loadGifts]);

  const personIdFromUrl = params.get('for') ?? '';
  const [pid, setPid] = useState(personIdFromUrl);
  useEffect(() => { setPid(personIdFromUrl || ''); }, [personIdFromUrl]);

  const person = useMemo(() => people.find((p) => p.id === pid) ?? null, [people, pid]);
  const first = person?.full_name.split(/\s+/)[0] ?? null;

  const [budget, setBudget] = useState<number | ''>('');
  const [occasion, setOccasion] = useState<string>('');
  const [extraInterest, setExtraInterest] = useState<string>('');
  const [interests, setInterests] = useState<string[]>([]);
  const [moreLike, setMoreLike] = useState<string[]>([]);
  const [notForMe, setNotForMe] = useState<string[]>([]);
  const [results, setResults] = useState<AiIdea[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const suggestedOccasion = useMemo(() => {
    if (!person) return null;
    const next = upcomingWithin(dates, 60).find(
      (d) => d.person_id === person.id
        && (d.date_type === 'birthday' || d.date_type === 'anniversary' || d.date_type === 'holiday'),
    );
    return next?.label ?? null;
  }, [dates, person]);

  function pickPerson(id: string) {
    setPid(id);
    if (id) setParams({ for: id }, { replace: true });
    else setParams({}, { replace: true });
    setResults([]);
    setMoreLike([]);
    setNotForMe([]);
  }

  function addInterest() {
    const v = extraInterest.trim();
    if (!v) return;
    setInterests((curr) => Array.from(new Set([...curr, v])));
    setExtraInterest('');
  }
  function removeInterest(v: string) {
    setInterests((curr) => curr.filter((x) => x !== v));
  }

  async function generate() {
    if (!person) { setErr('Pick who this is for first.'); return; }
    setBusy(true); setErr(null);
    try {
      const seen = [...results.map((r) => r.title), ...moreLike, ...notForMe];
      const fresh = await aiGiftIdeasShopper(person, {
        budget: typeof budget === 'number' ? budget : undefined,
        occasion: occasion || suggestedOccasion || undefined,
        extraInterests: interests,
        moreLike,
        notForMe,
        exclude: seen,
      });
      setResults((curr) => [...curr, ...fresh]);
      if (fresh.length === 0) {
        toast.error('Claude could not find new ideas. Try widening the budget or adding an interest.');
      }
    } catch (e) {
      setErr(friendlyError(e, 'Could not generate ideas right now.'));
    } finally { setBusy(false); }
  }

  function thumbUp(title: string) {
    setMoreLike((curr) => Array.from(new Set([...curr, title])));
    setNotForMe((curr) => curr.filter((t) => t !== title));
    toast.success(`Got it — more like "${title.slice(0, 30)}".`);
  }
  function thumbDown(title: string) {
    setNotForMe((curr) => Array.from(new Set([...curr, title])));
    setMoreLike((curr) => curr.filter((t) => t !== title));
    setResults((curr) => curr.filter((r) => r.title !== title));
    toast.success('Got it — we will skip that style.');
  }

  async function save(idea: AiIdea) {
    if (!person || !user) return;
    try {
      await addIdea({
        person_id: person.id,
        title: idea.title,
        reason: idea.reason,
        source: 'ai',
        estimated_cost: idea.estimated_cost ?? null,
      }, user.id);
      toast.success(`Saved to ${first}'s idea list.`);
    } catch (e) {
      toast.error(friendlyError(e, 'Could not save.'));
    }
  }

  const personIdeas = useMemo(
    () => (person ? ideas.filter((i) => i.person_id === person.id) : ideas),
    [ideas, person],
  );

  return (
    <section className="animate-bloom">
      <header className="mb-6">
        <h1 className="text-4xl">Gift shopper</h1>
        <p className="text-charcoal-500 dark:text-charcoal-300 mt-1">
          {person
            ? `Tailored ideas for ${first}, using everything you've told us about them.`
            : 'Pick a person to get personalized ideas. Set a budget and like the ones that fit.'}
        </p>
      </header>

      <div className="card-journal mb-4">
        <label className="block">
          <span className="text-xs uppercase tracking-wider text-charcoal-500 dark:text-charcoal-300">
            Who is this for?
          </span>
          <select value={pid} onChange={(e) => pickPerson(e.target.value)}
            className="mt-1 w-full rounded-journal border border-cream-300 dark:border-charcoal-700
                       bg-ivory-50 dark:bg-charcoal-800 px-3 py-2 text-sm
                       text-charcoal-900 dark:text-cream-50">
            <option value="">Pick someone…</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>{p.full_name}</option>
            ))}
          </select>
        </label>

        {person && (
          <div className="mt-4 grid sm:grid-cols-2 gap-4">
            <div>
              <span className="text-xs uppercase tracking-wider text-charcoal-500 dark:text-charcoal-300">
                Budget
              </span>
              <div className="mt-1 flex flex-wrap gap-2 items-center">
                {BUDGET_PRESETS.map((amt) => {
                  const on = budget === amt;
                  return (
                    <button key={amt} type="button" onClick={() => setBudget(amt)}
                      aria-pressed={on}
                      className={[
                        'rounded-full border-2 px-3 py-1 text-xs transition-all',
                        on
                          ? 'bg-terracotta-600 border-terracotta-700 text-ivory-50 font-semibold shadow-sm'
                          : 'bg-ivory-50 border-cream-300 text-charcoal-700 hover:bg-cream-100 dark:bg-charcoal-800 dark:border-charcoal-700 dark:text-cream-100',
                      ].join(' ')}>
                      ${amt}
                    </button>
                  );
                })}
                <input
                  type="number" min="0" step="5" placeholder="Custom $"
                  value={typeof budget === 'number' ? budget : ''}
                  onChange={(e) => setBudget(e.target.value ? Number(e.target.value) : '')}
                  className="w-24 rounded-full border border-cream-300 dark:border-charcoal-700
                             bg-ivory-50 dark:bg-charcoal-800 px-3 py-1 text-xs
                             text-charcoal-900 dark:text-cream-50" />
              </div>
            </div>
            <div>
              <span className="text-xs uppercase tracking-wider text-charcoal-500 dark:text-charcoal-300">
                Occasion {suggestedOccasion && (
                  <em className="normal-case lowercase font-normal">
                    (we noticed: {suggestedOccasion})
                  </em>
                )}
              </span>
              <div className="mt-1 flex flex-wrap gap-2">
                {OCCASIONS.map((o) => {
                  const on = occasion === o;
                  return (
                    <button key={o} type="button" onClick={() => setOccasion(on ? '' : o)}
                      aria-pressed={on}
                      className={[
                        'rounded-full border-2 px-3 py-1 text-xs transition-all capitalize',
                        on
                          ? 'bg-terracotta-600 border-terracotta-700 text-ivory-50 font-semibold shadow-sm'
                          : 'bg-ivory-50 border-cream-300 text-charcoal-700 hover:bg-cream-100 dark:bg-charcoal-800 dark:border-charcoal-700 dark:text-cream-100',
                      ].join(' ')}>
                      {o}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="sm:col-span-2">
              <span className="text-xs uppercase tracking-wider text-charcoal-500 dark:text-charcoal-300">
                Anything else worth knowing?{' '}
                <em className="normal-case lowercase font-normal">
                  (loves bourbon, into trail running…)
                </em>
              </span>
              <div className="mt-1 flex flex-wrap gap-2 items-center">
                {interests.map((v) => (
                  <span key={v} className="chip">
                    {v}
                    <button type="button" onClick={() => removeInterest(v)}
                      className="ml-2 opacity-60 hover:opacity-100">×</button>
                  </span>
                ))}
                <div className="flex gap-2 flex-1 min-w-[200px]">
                  <input
                    value={extraInterest}
                    onChange={(e) => setExtraInterest(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addInterest())}
                    placeholder="Add an interest"
                    className="flex-1 rounded-journal border border-cream-300 dark:border-charcoal-700
                               bg-ivory-50 dark:bg-charcoal-800 px-3 py-1 text-xs
                               text-charcoal-900 dark:text-cream-50" />
                  <button type="button" onClick={addInterest}
                    className="btn-ghost text-xs border border-cream-200 dark:border-charcoal-700">
                    Add
                  </button>
                </div>
              </div>
            </div>
            {err && (
              <p className="sm:col-span-2 text-sm text-terracotta-700 dark:text-terracotta-300">
                {err}
              </p>
            )}
            <div className="sm:col-span-2 flex justify-end">
              <button onClick={() => void generate()} disabled={busy} className="btn-primary">
                {busy
                  ? 'Searching…'
                  : results.length === 0
                    ? '✨ Find gift ideas'
                    : '✨ Find more ideas'}
              </button>
            </div>
          </div>
        )}
      </div>

      {person && results.length > 0 && (
        <section className="mb-8">
          <div className="mb-3">
            <h2 className="font-serif text-2xl text-charcoal-900 dark:text-cream-50">
              Ideas to consider
            </h2>
            <p className="text-xs text-charcoal-500 dark:text-charcoal-300 mt-0.5">
              Save the ones you love. Thumbs-up biases the next batch toward similar ideas;
              thumbs-down removes that style entirely.
            </p>
          </div>
          <ul className="grid gap-3 md:grid-cols-2">
            {results.map((idea, i) => (
              <li key={`${idea.title}-${i}`}>
                <ResultCard
                  idea={idea}
                  liked={moreLike.includes(idea.title)}
                  onSave={() => void save(idea)}
                  onThumbUp={() => thumbUp(idea.title)}
                  onThumbDown={() => thumbDown(idea.title)}
                  forName={first}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      {!person && <BudgetSnapshot />}

      <section>
        <div className="mb-3">
          <h2 className="font-serif text-2xl text-charcoal-900 dark:text-cream-50">
            {person ? `Saved for ${first}` : 'Saved ideas'}
          </h2>
          <p className="text-xs text-charcoal-500 dark:text-charcoal-300 mt-0.5">
            {personIdeas.length === 0
              ? 'Once you save an idea above, it lands here forever.'
              : 'Your bank — ready when an occasion comes around.'}
          </p>
        </div>
        {personIdeas.length === 0 ? (
          <div className="card-journal text-center py-10">
            <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-cream-200 flex items-center justify-center text-2xl">🎁</div>
            <p className="text-sm text-charcoal-700 dark:text-cream-100 max-w-md mx-auto">
              {person
                ? `No saved ideas for ${first} yet. Generate some above and tap Save on any that fit.`
                : 'Pick someone above to start a gift bank for them.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {personIdeas.map((i) => (
              <GiftIdeaCard
                key={i.id}
                idea={i}
                showPerson={person ? null : (people.find((p) => p.id === i.person_id)?.full_name ?? null)}
              />
            ))}
          </div>
        )}
      </section>

      {given.length > 0 && (
        <section className="mt-8">
          <h2 className="font-serif text-2xl text-charcoal-900 dark:text-cream-50">Given before</h2>
          <p className="text-xs text-charcoal-500 dark:text-charcoal-300 mt-0.5 mb-3">
            So you do not accidentally repeat yourself.
          </p>
          <div className="card-journal">
            {given.slice(0, 8).map((g) => (
              <div key={g.id} className="py-2 border-b border-cream-200 last:border-0">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-charcoal-900 dark:text-cream-50">{g.title}</div>
                  <div className="text-xs text-charcoal-500 dark:text-charcoal-300">{g.given_on}</div>
                </div>
                {g.occasion && (
                  <div className="text-xs text-charcoal-500 dark:text-charcoal-300">{g.occasion}</div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {!person && people.length === 0 && (
        <div className="card-journal text-center py-10 mt-6">
          <p className="text-sm text-charcoal-700 dark:text-cream-100">
            You have not added anyone yet.{' '}
            <Link to="/relationships/people/new"
              className="text-terracotta-700 dark:text-terracotta-300 underline font-medium">
              Add someone first
            </Link>{' '}
            to start saving gift ideas.
          </p>
        </div>
      )}
    </section>
  );
}

function ResultCard(props: {
  idea: AiIdea;
  liked: boolean;
  forName: string | null;
  onSave: () => void;
  onThumbUp: () => void;
  onThumbDown: () => void;
}) {
  const { idea, liked, forName, onSave, onThumbUp, onThumbDown } = props;
  const search = encodeURIComponent(idea.title);
  const buyHref = `https://www.amazon.com/s?k=${search}`;
  return (
    <div className={[
      'card-journal h-full flex flex-col gap-3',
      liked ? 'ring-2 ring-terracotta-400/60' : '',
    ].join(' ')}>
      <div className="flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-serif text-lg text-charcoal-900 dark:text-cream-50">{idea.title}</h3>
          {idea.estimated_cost != null && (
            <span className="chip text-[11px] shrink-0">~${idea.estimated_cost}</span>
          )}
        </div>
        <p className="text-sm text-charcoal-700 dark:text-cream-100 mt-1">{idea.reason}</p>
        {forName && (
          <p className="text-xs text-charcoal-500 dark:text-charcoal-300 mt-1">For {forName}</p>
        )}
      </div>
      <div className="flex items-center gap-2 pt-2 border-t border-cream-200 dark:border-charcoal-700">
        <button onClick={onSave} className="btn-primary text-xs">Save</button>
        <a href={buyHref} target="_blank" rel="noopener noreferrer"
          className="btn-ghost text-xs border border-cream-200 dark:border-charcoal-700">
          🛒 Shop
        </a>
        <span className="flex-1" />
        <button onClick={onThumbUp} title="More like this"
          aria-pressed={liked}
          className={[
            'rounded-full px-2 py-1 text-sm transition-colors',
            liked
              ? 'bg-terracotta-600 text-ivory-50'
              : 'text-charcoal-500 hover:bg-cream-100 dark:hover:bg-charcoal-800',
          ].join(' ')}>
          👍
        </button>
        <button onClick={onThumbDown} title="Not for them"
          className="rounded-full px-2 py-1 text-sm text-charcoal-500
                     hover:bg-cream-100 dark:hover:bg-charcoal-800">
          👎
        </button>
      </div>
    </div>
  );
}
