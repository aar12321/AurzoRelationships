// PersonActionsPanel — the action grid the latest walkthrough asked
// for: instead of empty-state placeholder cards, surface the things a
// user can actually do with this person.  Compose a message · see the
// gift ideas you've already saved (with count) · open the gift shopper
// scoped to them · jump to memories.  Each card carries a one-line
// nudge so a brand-new user knows what the action does.

import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useGiftsStore } from '@/stores/giftsStore';
import type { Person } from '@/types/people';

type Props = { person: Person };

export default function PersonActionsPanel({ person }: Props) {
  const ideas = useGiftsStore((s) => s.ideas);
  const given = useGiftsStore((s) => s.given);
  const load = useGiftsStore((s) => s.load);

  useEffect(() => {
    if (ideas.length === 0 && given.length === 0) void load();
  }, [load, ideas.length, given.length]);

  const personIdeas = ideas.filter((i) => i.person_id === person.id);
  const personGiven = given.filter((g) => g.person_id === person.id);
  const first = person.full_name.split(/\s+/)[0] ?? person.full_name;

  return (
    <section className="mb-6">
      <div className="mb-3">
        <h2 className="font-serif text-2xl text-charcoal-900 dark:text-cream-50">
          What would you like to do?
        </h2>
        <p className="text-xs text-charcoal-500 dark:text-charcoal-300 mt-0.5">
          Quick actions for {first}. Each opens the right tool with their context loaded.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <ActionCard
          to={`/relationships/people/${person.id}/messages`}
          icon="✉️"
          title="Compose a message"
          body={`Draft a warm note to ${first} — Claude can suggest a tone if you're stuck.`}
        />
        <ActionCard
          to={`/relationships/people/${person.id}/gifts`}
          icon="🎁"
          title="Saved gift ideas"
          body={
            personIdeas.length === 0
              ? `You have not saved any gift ideas for ${first} yet. Open to add one.`
              : `${personIdeas.length} idea${personIdeas.length === 1 ? '' : 's'} saved${
                  personGiven.length > 0 ? ` · ${personGiven.length} given` : ''
                }.`
          }
        />
        <ActionCard
          to={`/relationships/gifts?for=${person.id}`}
          icon="🛍️"
          title="Open the gift shopper"
          body={`Generate fresh ideas tailored to ${first}, set a budget, like the ones that fit.`}
        />
        <ActionCard
          to={`/relationships/people/${person.id}/memories`}
          icon="📸"
          title="Memories with them"
          body={`Capture or browse moments you shared with ${first}. Photos welcome.`}
        />
      </div>
    </section>
  );
}

function ActionCard(props: { to: string; icon: string; title: string; body: string }) {
  return (
    <Link
      to={props.to}
      className="card-journal flex items-start gap-3 p-4 hover:-translate-y-0.5
                 hover:shadow-warm-dark transition-all"
    >
      <span className="text-2xl leading-none mt-0.5" aria-hidden>{props.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="font-serif text-lg text-charcoal-900 dark:text-cream-50">{props.title}</div>
        <p className="text-xs text-charcoal-600 dark:text-charcoal-300 mt-1 leading-snug">
          {props.body}
        </p>
      </div>
      <span className="text-charcoal-400 dark:text-charcoal-500 text-sm shrink-0 mt-1.5"
            aria-hidden>→</span>
    </Link>
  );
}
