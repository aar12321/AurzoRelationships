import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { getPlatformUI } from '../services/aurzo/auth';
import {
  membershipSignupUrl,
  PLATFORM_LABEL,
  PLATFORM_TAGLINE,
} from '../services/aurzo/config';

// Aurzo Relationship OS — login-only mode.
// No OAuth, no in-app signup. Sign-ups happen at the unified Aurzo
// membership portal; this page only authenticates existing members.
// Visual direction matches the warm, journal-like aesthetic spec'd in
// CLAUDE.md: cream/ivory base, terracotta accents, elegant serif headers.

type UI = { label: string; tagline: string };

const FALLBACK: UI = {
  label: PLATFORM_LABEL,
  tagline: PLATFORM_TAGLINE,
};

function EyeIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {open ? (
        <>
          <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
          <circle cx="12" cy="12" r="3" />
        </>
      ) : (
        <>
          <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a19.79 19.79 0 0 1 5.06-5.94" />
          <path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 7 11 7a19.79 19.79 0 0 1-4 5.19" />
          <path d="M1 1l22 22" />
        </>
      )}
    </svg>
  );
}

export default function AurzoLoginPage() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const expired = params.get('expired') === '1';

  const [ui, setUi] = useState<UI>(FALLBACK);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState<string | null>(
    expired ? 'Your session expired. Please sign in again.' : null,
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await getPlatformUI();
        if (data) {
          setUi({
            label: data.label ?? FALLBACK.label,
            tagline: data.tagline ?? FALLBACK.tagline,
          });
        }
      } catch {
        /* remote branding is optional */
      }
    })();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setNotice(null);
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      nav('/relationships');
    } catch (caught: any) {
      const msg = (caught?.message || '').toLowerCase();
      if (msg.includes('invalid')) {
        setErr('Invalid email or password.');
      } else if (msg.includes('not confirmed')) {
        setErr('Please confirm your email before signing in.');
      } else {
        setErr(caught?.message || 'Sign-in failed. Please try again.');
      }
    } finally {
      setBusy(false);
    }
  }

  async function onResetPassword() {
    setErr(null);
    setNotice(null);
    if (!email.trim()) {
      setErr('Enter your email above, then tap Forgot password again.');
      return;
    }
    setResetting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/login`,
      });
      if (error) throw error;
      setNotice(`Password reset link sent to ${email.trim()}.`);
    } catch (caught: any) {
      setErr(caught?.message || 'Could not send reset email.');
    } finally {
      setResetting(false);
    }
  }

  function goToMembershipSignup() {
    window.location.href = membershipSignupUrl();
  }

  const fieldBase =
    'w-full rounded-lg border border-stone-300 bg-white/80 text-stone-800 placeholder-stone-400 px-4 py-3 outline-none focus:border-amber-700 focus:bg-white transition';

  return (
    <main className="min-h-screen bg-[#fbf6ee] text-stone-800 flex flex-col md:flex-row">
      {/* Left hero pane — warm journal aesthetic */}
      <aside className="relative md:flex-1 min-h-[34vh] md:min-h-screen overflow-hidden bg-gradient-to-br from-[#e8d5b7] via-[#d4a574] to-[#b8654c]">
        <div className="absolute inset-0 opacity-30 pointer-events-none">
          <div className="absolute -top-20 -left-20 h-72 w-72 rounded-full bg-amber-100 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-rose-100 blur-3xl" />
        </div>
        <div className="relative h-full flex flex-col justify-end md:justify-center p-8 md:p-14 max-w-lg text-stone-900">
          <p className="text-stone-800/80 text-xs tracking-[0.2em] uppercase mb-3">
            Aurzo Suite
          </p>
          <h2 className="font-serif text-4xl md:text-5xl leading-tight mb-4">
            {ui.label}
          </h2>
          <p className="text-stone-800/80 text-base md:text-lg max-w-sm leading-relaxed">
            {ui.tagline}
          </p>
          <p className="mt-10 text-stone-800/70 text-xs">
            Part of AurzoMorning — one membership, every tool.
          </p>
        </div>
      </aside>

      {/* Right form pane */}
      <section className="md:flex-1 flex items-center justify-center px-6 py-10 md:py-16">
        <div className="w-full max-w-sm">
          <header className="mb-7">
            <h1 className="font-serif text-3xl text-stone-900">Welcome back</h1>
            <p className="text-stone-600 text-sm mt-1">
              Sign in to {ui.label}.
            </p>
          </header>

          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <label className="block space-y-1.5">
              <span className="text-sm text-stone-700">Email</span>
              <input
                type="email"
                autoComplete="email"
                inputMode="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={fieldBase}
              />
            </label>

            <label className="block space-y-1.5">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-stone-700">Password</span>
                <button
                  type="button"
                  onClick={onResetPassword}
                  disabled={resetting}
                  className="text-xs text-amber-800 hover:text-amber-900 disabled:opacity-60"
                >
                  {resetting ? 'Sending…' : 'Forgot password?'}
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className={`${fieldBase} pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                  aria-pressed={showPw}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-stone-500 hover:text-stone-800 rounded"
                >
                  <EyeIcon open={showPw} />
                </button>
              </div>
            </label>

            {err && (
              <p role="alert" className="text-rose-700 text-sm">
                {err}
              </p>
            )}
            {notice && (
              <p role="status" className="text-emerald-700 text-sm">
                {notice}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-[#b8654c] hover:bg-[#a05841] text-white py-3 font-medium transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <button
            type="button"
            onClick={goToMembershipSignup}
            className="mt-5 w-full rounded-lg border border-stone-300 bg-white text-stone-800 py-3 font-medium transition hover:bg-stone-50"
          >
            Create account
          </button>

          <p className="mt-6 text-center text-xs text-stone-500 leading-relaxed">
            One Aurzo account works across every Aurzo platform. Passwords are
            managed in your{' '}
            <span className="font-medium text-amber-800">Aurzo Membership</span>{' '}
            portal.
          </p>
        </div>
      </section>
    </main>
  );
}
