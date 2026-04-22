import { useAuthStore } from '@/stores/authStore';

export default function Dashboard() {
  const { user } = useAuthStore();
  const name = user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? 'friend';

  return (
    <section className="animate-bloom">
      <header className="mb-8">
        <h1 className="text-4xl">Hello, {name}</h1>
        <p className="text-charcoal-500 mt-1">
          A quiet place for the people who matter most.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="card-journal">
          <div className="text-xs uppercase tracking-wide text-gold-700">
            Reach-out queue
          </div>
          <p className="mt-2 text-charcoal-700">
            Once you add people, a few will surface here each week.
          </p>
        </div>

        <div className="card-journal">
          <div className="text-xs uppercase tracking-wide text-gold-700">
            Upcoming dates
          </div>
          <p className="mt-2 text-charcoal-700">
            Birthdays, anniversaries, and milestones will appear here.
          </p>
        </div>

        <div className="card-journal">
          <div className="text-xs uppercase tracking-wide text-gold-700">
            Weekly pulse
          </div>
          <p className="mt-2 text-charcoal-700">
            On Sunday mornings, one person worth nurturing this week.
          </p>
        </div>
      </div>
    </section>
  );
}
