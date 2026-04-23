import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { getMyProfile, listApps, updateMyProfile } from '@/services/coreService';
import { setTheme } from '@/services/themeService';
import {
  readLayoutPref,
  writeLayoutPref,
  type LayoutPref,
} from '@/services/layoutModeService';
import type { AurzoApp, AurzoProfile } from '@/types/core';
import FieldRow, { inputClass } from '@/features/people/form/FieldRow';

export default function SettingsPage() {
  const { user, logout } = useAuthStore();
  const [profile, setProfile] = useState<AurzoProfile | null>(null);
  const [apps, setApps] = useState<AurzoApp[]>([]);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [layoutPref, setLayoutPref] = useState<LayoutPref>(() => readLayoutPref());

  useEffect(() => {
    void getMyProfile().then((p) => {
      setProfile(p);
      if (p?.theme) setTheme(p.theme);
    });
    void listApps().then(setApps);
  }, []);

  function changeLayout(next: LayoutPref) {
    setLayoutPref(next);
    writeLayoutPref(next);
    setMsg('Layout updated');
    setTimeout(() => setMsg(null), 1200);
  }

  async function save<K extends keyof AurzoProfile>(key: K, value: AurzoProfile[K]) {
    if (!user || !profile) return;
    setSaving(true);
    try {
      const next = await updateMyProfile({ [key]: value } as Partial<AurzoProfile>, user.id);
      setProfile(next);
      if (key === 'theme') setTheme(value as 'light' | 'dark' | 'auto');
      setMsg('Saved');
      setTimeout(() => setMsg(null), 1200);
    } finally { setSaving(false); }
  }

  async function copyId() {
    if (!user) return;
    await navigator.clipboard.writeText(user.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <section className="animate-bloom max-w-2xl">
      <header className="mb-6">
        <h1 className="text-4xl">Settings</h1>
        <p className="text-charcoal-500 mt-1">
          Notifications, theme, and privacy. Everything private by default.
        </p>
      </header>

      <div className="space-y-6">
        <div className="card-journal">
          <h2 className="font-serif text-2xl mb-3">You</h2>
          {profile && (
            <div className="space-y-4">
              <FieldRow label="Display name">
                <input defaultValue={profile.display_name ?? ''}
                  onBlur={(e) => void save('display_name', e.target.value || null)}
                  className={inputClass} />
              </FieldRow>
              <div className="grid sm:grid-cols-2 gap-4">
                <FieldRow label="Timezone">
                  <input defaultValue={profile.timezone}
                    onBlur={(e) => void save('timezone', e.target.value)}
                    className={inputClass} />
                </FieldRow>
                <FieldRow label="Theme">
                  <select value={profile.theme}
                    onChange={(e) => void save('theme', e.target.value as 'light' | 'dark' | 'auto')}
                    className={inputClass}>
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="auto">Auto</option>
                  </select>
                </FieldRow>
              </div>
              {msg && <p className="text-xs text-gold-700">{msg}</p>}
              {saving && <p className="text-xs text-charcoal-500">Saving…</p>}
            </div>
          )}
        </div>

        <div className="card-journal">
          <h2 className="font-serif text-2xl mb-1">Layout</h2>
          <p className="text-sm text-charcoal-500 dark:text-charcoal-300 mb-4">
            Auto follows your screen size. Force mobile for a bottom-tab shell
            on any device, or desktop for the full sidebar.
          </p>
          <div className="grid grid-cols-3 gap-2">
            {(['auto', 'mobile', 'desktop'] as LayoutPref[]).map((opt) => (
              <button key={opt} onClick={() => changeLayout(opt)}
                className={[
                  'rounded-journal border px-3 py-3 text-sm text-center transition-colors',
                  layoutPref === opt
                    ? 'border-terracotta-500 bg-terracotta-500/10 text-terracotta-700 dark:text-terracotta-300'
                    : 'border-cream-200 dark:border-charcoal-700 hover:bg-cream-100 dark:hover:bg-charcoal-800',
                ].join(' ')}>
                <div className="text-lg mb-1" aria-hidden>
                  {opt === 'auto' ? '🖥️📱' : opt === 'mobile' ? '📱' : '🖥️'}
                </div>
                <div className="font-medium capitalize">{opt}</div>
                <div className="text-[11px] text-charcoal-500 dark:text-charcoal-300 mt-0.5">
                  {opt === 'auto'
                    ? 'Follow screen'
                    : opt === 'mobile'
                    ? 'Bottom tabs'
                    : 'Sidebar'}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="card-journal">
          <h2 className="font-serif text-2xl mb-3">Your Aurzo id</h2>
          <p className="text-sm text-charcoal-500 mb-3">
            Share this with your partner to open couples mode.
          </p>
          <div className="flex gap-2">
            <input readOnly value={user?.id ?? ''} className={inputClass + ' font-mono text-xs'} />
            <button onClick={copyId} className="btn-primary text-xs">
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>

        <div className="card-journal">
          <h2 className="font-serif text-2xl mb-3">Your Aurzo apps</h2>
          <p className="text-sm text-charcoal-500 mb-3">
            One login, every app. These all share your identity and preferences.
          </p>
          <ul className="space-y-1 text-sm">
            {apps.map((a) => (
              <li key={a.id} className="flex items-center justify-between py-1 border-b border-cream-200 last:border-0">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: a.accent_color ?? '#b0623f' }} />
                  {a.name}
                </span>
                <span className="text-xs text-charcoal-500">{a.route}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="card-journal">
          <h2 className="font-serif text-2xl mb-3">Account</h2>
          <div className="flex gap-3">
            <button onClick={() => void logout()} className="btn-ghost">Sign out</button>
          </div>
        </div>
      </div>
    </section>
  );
}
