import { useEffect, useState } from 'react';
import {
  getUserSettings,
  saveUserSettings,
  signOut,
} from '@/services/aurzo/auth';
import {
  PLATFORM_LABEL,
  membershipDashboardUrl,
  membershipPasswordUrl,
} from '@/services/aurzo/config';

type Viewport = 'web' | 'mobile' | 'auto';

type LocalPrefs = {
  viewport: Viewport;
  partner_name: string;
  primary?: string;
  matters?: string;
};

const PREFS_KEY = 'aurzo.relationships.prefs';

function readLocalPrefs(): Partial<LocalPrefs> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(PREFS_KEY) || '{}');
  } catch {
    return {};
  }
}

export default function AurzoSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [prefs, setPrefs] = useState<LocalPrefs>({
    viewport: 'auto',
    partner_name: '',
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const remote = await getUserSettings();
      const local = readLocalPrefs();
      if (cancelled) return;
      setPrefs({
        viewport: ((remote.viewport as Viewport) ?? 'auto'),
        partner_name:
          (remote.preferences as Record<string, string> | undefined)?.partner_name ??
          (local as Record<string, string>).partner_name ??
          '',
        primary: local.primary,
        matters: local.matters,
      });
      setLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    await saveUserSettings({
      viewport: prefs.viewport,
      preferences: {
        partner_name: prefs.partner_name,
        primary: prefs.primary,
        matters: prefs.matters,
      },
    });
    if (typeof window !== 'undefined') {
      const existing = readLocalPrefs();
      localStorage.setItem(
        PREFS_KEY,
        JSON.stringify({ ...existing, ...prefs }),
      );
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleSignOut() {
    await signOut();
    window.location.href = membershipDashboardUrl();
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-ivory-50">
        <div className="text-charcoal-500 text-sm">Loading settings…</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-ivory-50 text-charcoal-900">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="mb-8">
          <div className="text-xs uppercase tracking-[0.2em] text-charcoal-500">Settings</div>
          <h1 className="mt-2 text-3xl font-serif">{PLATFORM_LABEL}</h1>
        </div>

        {/* Viewport */}
        <Section
          title="Viewport"
          subtitle="Choose how Relationship OS should render on this device."
        >
          <div className="space-y-2">
            {(['auto', 'web', 'mobile'] as Viewport[]).map((v) => (
              <label
                key={v}
                className="flex items-center gap-3 rounded-journal border border-cream-200 bg-white px-4 py-3 cursor-pointer"
              >
                <input
                  type="radio"
                  name="viewport"
                  value={v}
                  checked={prefs.viewport === v}
                  onChange={() => setPrefs((p) => ({ ...p, viewport: v }))}
                  className="accent-terracotta-700"
                />
                <span className="capitalize font-medium">{v}</span>
                <span className="text-xs text-charcoal-500">
                  {v === 'auto' && 'Adapt to screen size'}
                  {v === 'web' && 'Force desktop layout'}
                  {v === 'mobile' && 'Force mobile layout'}
                </span>
              </label>
            ))}
          </div>
        </Section>

        {/* Relationships-specific */}
        <Section
          title="Your relationships"
          subtitle="Personalize Relationship OS around the people who matter most."
        >
          <label className="block">
            <span className="text-sm text-charcoal-500">Partner name?</span>
            <input
              type="text"
              value={prefs.partner_name}
              onChange={(e) => setPrefs((p) => ({ ...p, partner_name: e.target.value }))}
              placeholder="e.g. Jordan"
              className="mt-1 w-full rounded-journal border border-cream-200 bg-white px-3 py-2 focus:outline-none focus:border-terracotta-500"
            />
            <span className="block mt-1 text-xs text-charcoal-500">
              Used for Couples Mode, date reminders, and gift ideas.
            </span>
          </label>
        </Section>

        {/* Password via membership */}
        <Section
          title="Password"
          subtitle="Your Aurzo membership owns your identity and password."
        >
          <a
            href={membershipPasswordUrl()}
            className="inline-flex items-center rounded-journal border border-cream-200 bg-white hover:bg-cream-50 px-4 py-2.5 font-medium"
          >
            Change password in membership portal →
          </a>
        </Section>

        {/* Actions */}
        <div className="flex items-center gap-3 mt-10">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-journal bg-terracotta-700 hover:bg-terracotta-800 text-cream-50 px-5 py-2.5 font-medium disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save settings'}
          </button>
          {saved && (
            <span className="text-sm text-charcoal-500">Saved.</span>
          )}
          <div className="flex-1" />
          <button
            type="button"
            onClick={handleSignOut}
            className="rounded-journal border border-cream-200 bg-white hover:bg-cream-50 px-4 py-2.5 text-charcoal-700 font-medium"
          >
            Sign out
          </button>
        </div>
      </div>
    </main>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8 rounded-journal border border-cream-200 bg-white p-6">
      <h2 className="text-lg font-serif mb-1">{title}</h2>
      {subtitle && <p className="text-sm text-charcoal-500 mb-4">{subtitle}</p>}
      {children}
    </section>
  );
}
