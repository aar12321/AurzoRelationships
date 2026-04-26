import { useMemo } from 'react';
import { groupBalance, type GroupBalance } from '@/services/balanceService';
import { usePeopleStore } from '@/stores/peopleStore';
import { useInteractionsStore } from '@/stores/interactionsStore';

export default function BalancePanel() {
  const people = usePeopleStore((s) => s.people);
  const interactions = useInteractionsStore((s) => s.interactions);
  const groups = useMemo(
    () => groupBalance(people, interactions).filter((g) => g.count > 0),
    [people, interactions],
  );

  if (groups.length < 2) return null;

  const maxShare = Math.max(...groups.map((g) => g.share), 0.01);

  return (
    <div className="card-journal mb-6">
      <h2 className="text-xs uppercase tracking-wider text-charcoal-500 dark:text-charcoal-300 mb-1">
        Balance — last 30 days
      </h2>
      <p className="text-sm text-charcoal-500 dark:text-charcoal-300 mb-3">
        Where your time is going by relationship type. No judgement — just a mirror.
      </p>
      <ul className="space-y-2">
        {groups.map((g) => <GroupRow key={g.type} group={g} maxShare={maxShare} />)}
      </ul>
    </div>
  );
}

function GroupRow({ group, maxShare }: { group: GroupBalance; maxShare: number }) {
  const pct = maxShare > 0 ? (group.share / maxShare) * 100 : 0;
  const avgLabel = group.avgDaysSinceContact === null
    ? 'no contact'
    : `~${Math.round(group.avgDaysSinceContact)}d avg gap`;
  return (
    <li className="flex items-center gap-3 text-sm">
      <span className="w-28 truncate text-charcoal-900 dark:text-cream-50">
        {group.label}
      </span>
      <div className="flex-1 relative h-3 rounded-full bg-cream-100 dark:bg-charcoal-800 overflow-hidden">
        <div className="absolute inset-y-0 left-0 rounded-full bg-gold-500/80 transition-all"
             style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-charcoal-500 dark:text-charcoal-300 w-44 text-right shrink-0">
        {group.recentInteractions30d} recent · {avgLabel}
      </span>
    </li>
  );
}
