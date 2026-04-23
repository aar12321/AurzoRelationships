import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationsStore } from '@/stores/notificationsStore';
import NotificationItem from './NotificationItem';

export default function NotificationBell() {
  const { user } = useAuthStore();
  const { items, load, watch, markAllRead, unreadCount } = useNotificationsStore();
  const [open, setOpen] = useState(false);
  const unread = unreadCount();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    void load();
    return watch(user.id);
  }, [user, load, watch]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        aria-label="Notifications"
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-full w-9 h-9 flex items-center justify-center
                   text-charcoal-700 hover:bg-cream-200 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18"
             viewBox="0 0 24 24" fill="none" stroke="currentColor"
             strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
        </svg>
        {unread > 0 && (
          <span className="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full
                           bg-terracotta-600 text-ivory-50 text-[10px] font-medium
                           flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto
                        card-journal z-20 animate-bloom p-0"
             style={{ padding: 0 }}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-cream-200">
            <div className="font-serif text-lg text-charcoal-900">Notifications</div>
            {unread > 0 && user && (
              <button className="text-xs text-charcoal-500 hover:text-charcoal-900"
                onClick={() => void markAllRead(user.id)}>
                Mark all read
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-charcoal-500">
              All quiet. We'll surface gentle nudges here.
            </div>
          ) : (
            <ul>
              {items.slice(0, 8).map((n) => (
                <NotificationItem key={n.id} notif={n} onClose={() => setOpen(false)} />
              ))}
            </ul>
          )}
          <div className="border-t border-cream-200 px-4 py-2 text-center">
            <Link to="/relationships/notifications"
              onClick={() => setOpen(false)}
              className="text-xs text-terracotta-700 hover:underline">
              See all
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
