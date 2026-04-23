import { useNotificationsStore } from '@/stores/notificationsStore';
import type { Notification } from '@/types/core';

const PRIORITY_COLOR: Record<Notification['priority'], string> = {
  low: 'bg-cream-200',
  normal: 'bg-gold-300',
  high: 'bg-terracotta-500',
  urgent: 'bg-terracotta-700',
};

type Props = { notif: Notification; onClose?: () => void };

export default function NotificationItem({ notif, onClose }: Props) {
  const { markRead, dismiss } = useNotificationsStore();
  const isUnread = notif.read_at == null;

  return (
    <li
      className={[
        'px-4 py-3 border-b border-cream-200 last:border-0',
        isUnread ? 'bg-ivory-50' : '',
      ].join(' ')}
      onClick={() => {
        if (isUnread) void markRead(notif.id);
      }}
    >
      <div className="flex items-start gap-3">
        <span className={[
          'h-2.5 w-2.5 rounded-full mt-1.5 flex-shrink-0',
          isUnread ? PRIORITY_COLOR[notif.priority] : 'bg-cream-200',
        ].join(' ')} />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-charcoal-900">{notif.title}</div>
          {notif.body && (
            <p className="text-xs text-charcoal-700 mt-1 whitespace-pre-wrap">
              {notif.body.length > 180 ? notif.body.slice(0, 180) + '…' : notif.body}
            </p>
          )}
          <div className="flex items-center justify-between mt-2">
            <span className="text-[10px] text-charcoal-500">
              {timeAgo(notif.sent_at)}
              {notif.app_id && ` · ${appName(notif.app_id)}`}
            </span>
            <div className="flex gap-2">
              {notif.action_url && (
                <a
                  href={notif.action_url}
                  className="text-xs text-terracotta-700 hover:underline"
                  onClick={onClose}
                >
                  Open
                </a>
              )}
              <button
                className="text-xs text-charcoal-500 hover:text-charcoal-900"
                onClick={(e) => { e.stopPropagation(); void dismiss(notif.id); }}
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d`;
  return new Date(iso).toLocaleDateString();
}

function appName(id: string): string {
  const map: Record<string, string> = {
    relationship_os: 'Relationships',
    subscription_mgr: 'Subscriptions',
    home_mgr: 'Home',
    womens_health: 'Health',
  };
  return map[id] ?? id;
}
