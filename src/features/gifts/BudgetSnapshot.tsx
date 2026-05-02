import { useMemo } from 'react';
import { useGiftsStore } from '@/stores/giftsStore';

export default function BudgetSnapshot() {
  const ideas = useGiftsStore((s) => s.ideas);
  const given = useGiftsStore((s) => s.given);

  const stats = useMemo(() => {
    const yearStart = new Date(new Date().getFullYear(), 0, 1);
    const planned = ideas
      .filter((i) => i.status === 'planned' && i.estimated_cost != null)
      .reduce((sum, i) => sum + (i.estimated_cost ?? 0), 0);
    const givenYtd = given
      .filter((g) => new Date(g.given_on) >= yearStart && g.cost != null)
      .reduce((sum, g) => sum + (g.cost ?? 0), 0);
    const givenCount = given.filter((g) => new Date(g.given_on) >= yearStart).length;
    return { planned, givenYtd, givenCount };
  }, [ideas, given]);

  if (stats.planned === 0 && stats.givenYtd === 0 && stats.givenCount === 0) {
    return null;
  }

  const fmt = (n: number) =>
    n.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

  return (
    <div className="card-journal mb-6 grid sm:grid-cols-3 gap-4">
      <Stat label="Planned spend" value={fmt(stats.planned)}
        hint="Sum of cost estimates marked planned." />
      <Stat label={`Given in ${new Date().getFullYear()}`} value={fmt(stats.givenYtd)}
        hint={`${stats.givenCount} gift${stats.givenCount === 1 ? '' : 's'} logged.`} />
      <Stat label="Avg per gift"
        value={stats.givenCount > 0 ? fmt(stats.givenYtd / stats.givenCount) : '—'}
        hint="Across logged gifts this year." />
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div>
      <div className="text-xs text-charcoal-500 dark:text-charcoal-300">{label}</div>
      <div className="font-serif text-2xl text-charcoal-900 dark:text-cream-50 mt-1">
        {value}
      </div>
      <div className="text-xs text-charcoal-500/80 dark:text-charcoal-300/80 mt-1">
        {hint}
      </div>
    </div>
  );
}
