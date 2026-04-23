import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { usePeopleStore } from '@/stores/peopleStore';
import ProfileHeader from './profile/ProfileHeader';
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

  return (
    <section className="animate-bloom">
      <ProfileHeader person={person} />
      <div className="grid gap-4 md:grid-cols-2">
        <NotesSection person={person} />
        <StorySection person={person} />
        <LifeContextSection person={person} />
        <PreferencesSection person={person} />
        <CustomFieldsSection person={person} />
      </div>
    </section>
  );
}
