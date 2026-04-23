import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationsStore } from '@/stores/notificationsStore';
import NotificationItem from './NotificationItem';

export default function NotificationsPage() {
  const { user } = useAuthStore();
  const { items, loading, load, watch, markAllRead, unreadCount } = useNotificationsStore();

  useEffect(() => {
    if (!user) return;
    void load();
    return watch(user.id);
  }, [user, load, watch]);

  const unread = unreadCount();

  return (
    <section className="animate-bloom">
      <header className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl">Notifications</h1>
          <p className="text-charcoal-500 mt-1">
            Gentle nudges from every Aurzo app, in one place.
          </p>
        </div>
        {unread > 0 && user && (
          <button className="btn-ghost" onClick={() => void markAllRead(user.id)}>
            Mark all read ({unread})
          </button>
        )}
      </header>

      {loading && items.length === 0 ? (
        <div className="card-journal text-sm text-charcoal-500">Loading…</div>
      ) : items.length === 0 ? (
        <div className="card-journal text-center py-12">
          <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-cream-200" />
          <p className="text-charcoal-700">
            All quiet. When a relationship is fading, a date is coming up, or
            another Aurzo app has something warm to share, it will land here.
          </p>
        </div>
      ) : (
        <ul className="card-journal" style={{ padding: 0 }}>
          {items.map((n) => (
            <NotificationItem key={n.id} notif={n} />
          ))}
        </ul>
      )}
    </section>
  );
}
