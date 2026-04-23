import { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationsStore } from '@/stores/notificationsStore';
import type { Notification } from '@/types/core';
import NotificationItem from './NotificationItem';

// Grouped + filterable notification center. Three time buckets (Today,
// This week, Earlier) and four filter chips (All, Unread, Pulses, Nudges).

type Filter = 'all' | 'unread' | 'pulse' | 'nudge';

export default function NotificationsPage() {
  const { user } = useAuthStore();
  const { items, loading, load, watch, markAllRead, unreadCount } = useNotificationsStore();
  const [filter, setFilter] = useState<Filter>('all');

  useEffect(() => {
    if (!user) return;
    void load();
    return watch(user.id);
  }, [user, load, watch]);

  const filtered = useMemo(() => applyFilter(items, filter), [items, filter]);
  const groups   = useMemo(() => groupByTime(filtered), [filtered]);
  const unread   = unreadCount();

  return (
    <section className="animate-bloom">
      <header className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl">Notifications</h1>
          <p className="text-charcoal-500 dark:text-charcoal-300 mt-1">
            Gentle nudges from every Aurzo app, in one place.
          </p>
        </div>
        {unread > 0 && user && (
          <button className="btn-ghost" onClick={() => void markAllRead(user.id)}>
            Mark all read ({unread})
          </button>
        )}
      </header>

      <div className="mb-4 flex gap-2 overflow-x-auto">
        {(['all', 'unread', 'pulse', 'nudge'] as Filter[]).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={[
              'chip whitespace-nowrap transition-colors',
              filter === f
                ? 'bg-terracotta-500 text-ivory-50 border-terracotta-500'
                : '',
            ].join(' ')}>
            {labelFor(f)}{countSuffix(items, f)}
          </button>
        ))}
      </div>

      {loading && items.length === 0 ? (
        <div className="card-journal text-sm text-charcoal-500 dark:text-charcoal-300">
          Loading…
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState filter={filter} />
      ) : (
        <div className="space-y-5">
          {groups.map((g) => (
            <section key={g.title}>
              <h2 className="text-xs uppercase tracking-wider text-charcoal-500
                             dark:text-charcoal-300 mb-2 px-1">
                {g.title} <span className="text-charcoal-500/60">· {g.items.length}</span>
              </h2>
              <ul className="card-journal p-0 overflow-hidden">
                {g.items.map((n) => <NotificationItem key={n.id} notif={n} />)}
              </ul>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}

function labelFor(f: Filter): string {
  return f === 'all' ? 'All' : f === 'unread' ? 'Unread'
    : f === 'pulse' ? 'Pulses' : 'Nudges';
}

function countSuffix(items: Notification[], f: Filter): string {
  const n = applyFilter(items, f).length;
  return n > 0 ? ` · ${n}` : '';
}

function applyFilter(items: Notification[], f: Filter): Notification[] {
  if (f === 'all')    return items;
  if (f === 'unread') return items.filter((n) => !n.read_at);
  if (f === 'pulse')  return items.filter((n) => n.category === 'weekly_pulse');
  return items.filter((n) => n.category === 'nudge');
}

function groupByTime(items: Notification[]): { title: string; items: Notification[] }[] {
  const now = new Date();
  const startToday = new Date(now); startToday.setHours(0, 0, 0, 0);
  const startWeek  = new Date(startToday); startWeek.setDate(startWeek.getDate() - 7);

  const today: Notification[] = [], week: Notification[] = [], earlier: Notification[] = [];
  for (const n of items) {
    const t = new Date(n.sent_at).getTime();
    if (t >= startToday.getTime()) today.push(n);
    else if (t >= startWeek.getTime()) week.push(n);
    else earlier.push(n);
  }
  return [
    { title: 'Today',     items: today   },
    { title: 'This week', items: week    },
    { title: 'Earlier',   items: earlier },
  ].filter((g) => g.items.length > 0);
}

function EmptyState({ filter }: { filter: Filter }) {
  const copy =
    filter === 'unread' ? "You're all caught up."
    : filter === 'pulse' ? 'No pulses yet. Your first Sunday pulse will land here.'
    : filter === 'nudge' ? 'No nudges right now — quiet and calm.'
    : "All quiet. When a relationship is fading, a date is coming up, or another Aurzo app has something warm to share, it will land here.";
  return (
    <div className="card-journal text-center py-12">
      <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-cream-200 dark:bg-charcoal-700" />
      <p className="text-charcoal-700 dark:text-cream-100 max-w-md mx-auto">{copy}</p>
    </div>
  );
}
