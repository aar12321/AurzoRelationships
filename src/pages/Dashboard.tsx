import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { usePeopleStore } from '@/stores/peopleStore';
import PersonCard from '@/features/people/PersonCard';

export default function Dashboard() {
  const { user } = useAuthStore();
  const { people, loadAll } = usePeopleStore();
  const name = user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? 'friend';

  useEffect(() => {
    if (people.length === 0) void loadAll();
  }, [loadAll, people.length]);

  const recent = [...people]
    .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
    .slice(0, 3);

  return (
    <section className="animate-bloom">
      <header className="mb-8">
        <h1 className="text-4xl">Hello, {name}</h1>
        <p className="text-charcoal-500 mt-1">
          A quiet place for the people who matter most.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <DashboardCard title="Reach-out queue">
          Once you add people, a few will surface here each week.
        </DashboardCard>
        <DashboardCard title="Upcoming dates">
          Birthdays, anniversaries, and milestones will appear here.
        </DashboardCard>
        <DashboardCard title="Weekly pulse">
          On Sunday mornings, one person worth nurturing this week.
        </DashboardCard>
      </div>

      <section>
        <div className="flex items-end justify-between mb-3">
          <h2 className="font-serif text-2xl text-charcoal-900">Recently added</h2>
          <Link to="/relationships/people" className="btn-ghost">See all</Link>
        </div>
        {recent.length === 0 ? (
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
            {recent.map((p, i) => <PersonCard key={p.id} person={p} index={i} />)}
          </div>
        )}
      </section>
    </section>
  );
}

function DashboardCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card-journal">
      <div className="text-xs uppercase tracking-wide text-gold-700">{title}</div>
      <p className="mt-2 text-charcoal-700">{children}</p>
    </div>
  );
}
