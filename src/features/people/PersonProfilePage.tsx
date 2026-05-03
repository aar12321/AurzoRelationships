import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { usePeopleStore } from '@/stores/peopleStore';
import ProfileHeader from './profile/ProfileHeader';
import PersonActionsPanel from './profile/PersonActionsPanel';
import {
  CustomFieldsSection,
  LifeContextSection,
  NotesSection,
  PreferencesSection,
  StorySection,
} from './profile/ProfileSections';

export default function PersonProfilePage() {
  const { id } = useParams();
  const { people, loading, loadAll, setActive } = usePeopleStore();
  const person = people.find((p) => p.id === id);

  useEffect(() => {
    if (people.length === 0) void loadAll();
  }, [loadAll, people.length]);

  useEffect(() => {
    setActive(id ?? null);
    return () => setActive(null);
  }, [id, setActive]);

  if (loading && !person) {
    return <div className="text-charcoal-500 text-sm">Loading…</div>;
  }

  if (!person) {
    return (
      <section className="animate-bloom">
        <div className="card-journal text-center py-12">
          <p className="text-charcoal-700">We couldn't find that person.</p>
          <Link to="/relationships/people" className="btn-primary mt-4 inline-flex">
            Back to People
          </Link>
        </div>
      </section>
    );
  }

  // Profile detail cards collapse when empty (see ProfileSections.tsx),
  // so a sparse profile reads as a clean action-first page rather than
  // a wall of placeholders. Edit page is the place to fill them in.
  const hasAnyDetail =
    Boolean(person.notes)
    || Boolean(person.how_we_met) || Boolean(person.met_on)
    || Boolean(person.life_context && Object.values(person.life_context).some(Boolean))
    || Boolean(person.relationship_goal) || Boolean(person.communication_pref) || Boolean(person.fading_threshold_days)
    || (person.custom_fields && person.custom_fields.length > 0);

  return (
    <section className="animate-bloom">
      <ProfileHeader person={person} />
      <PersonActionsPanel person={person} />

      {hasAnyDetail ? (
        <>
          <div className="mb-3">
            <h2 className="font-serif text-2xl text-charcoal-900 dark:text-cream-50">
              What you know about them
            </h2>
            <p className="text-xs text-charcoal-500 dark:text-charcoal-300 mt-0.5">
              The fabric of who they are right now. <Link to={`/relationships/people/${person.id}/edit`}
                className="underline">Edit details</Link> any time.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <NotesSection person={person} />
            <StorySection person={person} />
            <LifeContextSection person={person} />
            <PreferencesSection person={person} />
            <CustomFieldsSection person={person} />
          </div>
        </>
      ) : (
        <div className="card-journal text-center py-8">
          <p className="text-sm text-charcoal-500 dark:text-charcoal-300 max-w-md mx-auto">
            No notes yet. <Link to={`/relationships/people/${person.id}/edit`}
              className="text-terracotta-700 dark:text-terracotta-300 underline font-medium">
              Add notes, how you met, or small things you want to remember
            </Link> — even one line is enough to get nudges right.
          </p>
        </div>
      )}
    </section>
  );
}
