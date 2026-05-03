// Notifications preferences panel — user controls which channels they
// receive on, plus a global quiet-hours window. Absent rows are treated
// as "channel on" so a brand-new user gets in-app notifications by
// default. We never abuse — if the user turns email off here, the
// daily digest cron skips them; quiet hours suppress dispatch even
// when a channel is enabled.

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import {
  listNotificationPrefs,
  setChannelEnabled,
  setQuietHours,
} from '@/services/notificationsService';
import type { NotificationChannel, NotificationPref } from '@/types/core';
import { toast } from '@/stores/toastStore';
import FieldRow, { inputClass } from '@/features/people/form/FieldRow';

type Row = { channel: NotificationChannel; label: string; description: string };

const ROWS: Row[] = [
  { channel: 'in_app', label: 'In-app', description: 'The bell in your sidebar lights up.' },
  { channel: 'email',  label: 'Email',  description: 'Daily digest + urgent reach-out reminders.' },
  { channel: 'push',   label: 'Push',   description: 'Mobile push (coming soon).' },
];

export default function NotificationPrefsPanel() {
  const { user } = useAuthStore();
  const [prefs, setPrefs] = useState<NotificationPref[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<NotificationChannel | 'quiet' | null>(null);
  const [quietStart, setQuietStart] = useState<string>('');
  const [quietEnd, setQuietEnd] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    listNotificationPrefs()
      .then((rows) => {
        if (cancelled) return;
        setPrefs(rows);
        const withQuiet = rows.find((r) => r.quiet_hours_start && r.quiet_hours_end);
        if (withQuiet) {
          setQuietStart(toHHMM(withQuiet.quiet_hours_start));
          setQuietEnd(toHHMM(withQuiet.quiet_hours_end));
        }
      })
      .catch(() => { if (!cancelled) toast.error('Could not load notification settings.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  function isEnabled(channel: NotificationChannel): boolean {
    const row = prefs.find((p) => p.channel === channel);
    // Absent row = default on. Email defaults off so we never spam users
    // who haven't explicitly opted in.
    if (!row) return channel === 'in_app';
    return row.enabled;
  }

  async function toggle(channel: NotificationChannel) {
    if (!user) return;
    const next = !isEnabled(channel);
    setSaving(channel);
    try {
      await setChannelEnabled(user.id, channel, next);
      setPrefs((prev) => {
        const others = prev.filter((p) => p.channel !== channel);
        const existing = prev.find((p) => p.channel === channel);
        return [
          ...others,
          {
            user_id: user.id,
            channel,
            app_id: 'relationship_os',
            category: 'default',
            enabled: next,
            quiet_hours_start: existing?.quiet_hours_start ?? null,
            quiet_hours_end: existing?.quiet_hours_end ?? null,
          },
        ];
      });
      toast.success(next ? `${labelFor(channel)} on.` : `${labelFor(channel)} off.`);
    } catch {
      toast.error('Could not update setting.');
    } finally {
      setSaving(null);
    }
  }

  async function saveQuiet() {
    if (!user) return;
    const start = quietStart ? `${quietStart}:00` : null;
    const end = quietEnd ? `${quietEnd}:00` : null;
    setSaving('quiet');
    try {
      await setQuietHours(user.id, start, end);
      setPrefs((prev) => prev.map((p) => ({
        ...p, quiet_hours_start: start, quiet_hours_end: end,
      })));
      toast.success(start && end ? 'Quiet hours saved.' : 'Quiet hours cleared.');
    } catch {
      toast.error('Could not save quiet hours.');
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="card-journal">
      <h2 className="font-serif text-2xl mb-1">Notifications</h2>
      <p className="text-sm text-charcoal-500 dark:text-charcoal-300 mb-4">
        We never abuse this. Quiet hours suppress every channel.
      </p>

      {loading ? (
        <p className="text-sm text-charcoal-500">Loading…</p>
      ) : (
        <ul className="divide-y divide-cream-200 dark:divide-charcoal-700 mb-6">
          {ROWS.map((r) => (
            <li key={r.channel} className="flex items-center justify-between py-3 gap-3">
              <div>
                <div className="font-semibold text-charcoal-900 dark:text-cream-50">{r.label}</div>
                <div className="text-xs text-charcoal-600 dark:text-charcoal-300">{r.description}</div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isEnabled(r.channel)}
                disabled={saving === r.channel || r.channel === 'push'}
                onClick={() => void toggle(r.channel)}
                className={[
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                  isEnabled(r.channel) ? 'bg-terracotta-600' : 'bg-cream-300 dark:bg-charcoal-700',
                  r.channel === 'push' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
                ].join(' ')}
              >
                <span className={[
                  'inline-block h-5 w-5 transform rounded-full bg-ivory-50 transition-transform',
                  isEnabled(r.channel) ? 'translate-x-5' : 'translate-x-0.5',
                ].join(' ')} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="grid sm:grid-cols-3 gap-3 items-end">
        <FieldRow label="Quiet from">
          <input type="time" value={quietStart}
            onChange={(e) => setQuietStart(e.target.value)}
            className={inputClass} />
        </FieldRow>
        <FieldRow label="Quiet until">
          <input type="time" value={quietEnd}
            onChange={(e) => setQuietEnd(e.target.value)}
            className={inputClass} />
        </FieldRow>
        <button onClick={() => void saveQuiet()}
          disabled={saving === 'quiet'}
          className="btn-primary text-sm h-10">
          {saving === 'quiet' ? 'Saving…' : 'Save quiet hours'}
        </button>
      </div>
    </div>
  );
}

function labelFor(c: NotificationChannel): string {
  return ROWS.find((r) => r.channel === c)?.label ?? c;
}

function toHHMM(t: string | null): string {
  if (!t) return '';
  return t.slice(0, 5);
}
