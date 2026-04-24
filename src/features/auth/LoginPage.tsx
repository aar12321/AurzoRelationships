// /login — the AurzoMorning universal sign-in screen. Email + password only;
// signups live exclusively on aurzo.com per the platform spec. A session
// that vanishes mid-use is sent here with ?expired=1 so we can explain.

import { useRef, useState } from 'react';
import { Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { sendPasswordReset, signInWithPassword } from '@/services/auth';
import { useAuth } from '@/features/auth/AuthProvider';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

type LocState = { from?: { pathname?: string } };

export default function LoginPage() {
  useDocumentTitle('Sign in');
  const { session, loading } = useAuth();
  const location = useLocation();
  const [params] = useSearchParams();
  const from = (location.state as LocState | null)?.from?.pathname ?? '/relationships';
  const expired = params.get('expired') === '1';
  const reset = params.get('reset') === '1';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);

  if (!loading && session) return <Navigate to={from} replace />;

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      await signInWithPassword(email.trim(), password);
    } catch (err) {
      setError(friendlyError(err));
      passwordRef.current?.focus();
      passwordRef.current?.select();
    } finally { setBusy(false); }
  }

  async function handleForgot() {
    if (!email.trim()) {
      setError('Enter your email above and we\'ll send a reset link.');
      return;
    }
    setBusy(true); setError(null);
    try {
      await sendPasswordReset(email.trim());
      setResetSent(true);
    } catch (err) {
      setError(friendlyError(err));
    } finally { setBusy(false); }
  }

  return (
    <main className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-charcoal-950 text-cream-50">
      <VisualPanel />

      <section className="flex items-center justify-center px-6 py-12 lg:px-16">
        <div className="w-full max-w-sm">
          <h1 className="font-serif text-4xl mb-2">Welcome back.</h1>
          <p className="text-charcoal-300 mb-6">
            Sign in to Aurzo Relationships.
          </p>

          {expired && (
            <Banner tone="warn">
              Your session timed out for security. Sign in to continue where you left off.
            </Banner>
          )}
          {reset && !resetSent && (
            <Banner tone="info">
              Check your email — the reset link will bring you back here to set a new password.
            </Banner>
          )}
          {resetSent && (
            <Banner tone="success">
              Reset link sent to <strong className="break-all">{email}</strong>. Can't find it? Check spam.
            </Banner>
          )}

          <form onSubmit={handleSignIn} className="space-y-4" noValidate>
            <Field label="Email">
              <input type="email" name="email" autoComplete="email" inputMode="email"
                required value={email} onChange={(e) => setEmail(e.target.value)}
                spellCheck={false} autoCapitalize="off"
                className={inputCls}
                placeholder="you@example.com"
              />
            </Field>

            <Field label="Password">
              <div className="relative">
                <input ref={passwordRef}
                  type={show ? 'text' : 'password'} name="password"
                  autoComplete="current-password" required minLength={6}
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  className={inputCls + ' pr-12'} placeholder="••••••••"
                />
                <button type="button" onClick={() => setShow((s) => !s)}
                  aria-label={show ? 'Hide password' : 'Show password'}
                  aria-pressed={show}
                  className="absolute inset-y-0 right-0 px-3 text-xs text-charcoal-300
                             hover:text-cream-50 focus:outline-none focus:text-cream-50">
                  {show ? 'Hide' : 'Show'}
                </button>
              </div>
            </Field>

            <div className="flex justify-end">
              <button type="button" onClick={() => void handleForgot()} disabled={busy}
                className="text-xs text-terracotta-300 hover:text-terracotta-200 disabled:opacity-50">
                Forgot password?
              </button>
            </div>

            <button type="submit" disabled={busy || !email.trim() || !password}
              className="w-full rounded-journal px-4 py-2.5 bg-terracotta-500
                         hover:bg-terracotta-400 active:bg-terracotta-600
                         text-ivory-50 font-medium transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed">
              {busy ? 'Signing in…' : 'Sign in'}
            </button>

            {error && (
              <div role="alert" id="login-error"
                className="text-sm text-terracotta-200
                           bg-terracotta-900/30 border border-terracotta-700/50
                           rounded-journal px-3 py-2 flex items-start gap-2">
                <span aria-hidden>⚠</span>
                <span className="flex-1">{error}</span>
              </div>
            )}
          </form>

          <p className="mt-8 text-sm text-charcoal-300">
            Don't have an account?{' '}
            <a href="https://aurzo.com" className="text-terracotta-300 hover:text-terracotta-200 underline-offset-2 hover:underline">
              Create Account
            </a>
          </p>
        </div>
      </section>
    </main>
  );
}

function VisualPanel() {
  // Aurora: three large, softly-blurred gradient blobs drifting on keyframes.
  // Pure CSS (no image assets, ~500 bytes), respects prefers-reduced-motion.
  return (
    <aside
      aria-hidden="true"
      className="relative overflow-hidden hidden lg:flex
                 bg-[radial-gradient(circle_at_30%_20%,#2a1f1a,transparent_55%),radial-gradient(circle_at_70%_80%,#1a2230,transparent_55%)]
                 bg-charcoal-950 items-end p-12"
    >
      <style>{`
        @keyframes aurora-a { 0%,100% { transform: translate(-10%, -5%) scale(1); } 50% { transform: translate(25%, 15%) scale(1.35); } }
        @keyframes aurora-b { 0%,100% { transform: translate(15%, 20%) scale(1.1); } 50% { transform: translate(-15%, -10%) scale(1); } }
        @keyframes aurora-c { 0%,100% { transform: translate(0%, 40%) scale(0.9); } 50% { transform: translate(-20%, 20%) scale(1.25); } }
        @media (prefers-reduced-motion: reduce) {
          .aurora-blob { animation: none !important; }
        }
      `}</style>
      <div className="aurora-blob absolute -top-1/4 -left-1/4 w-[70vw] h-[70vw]
                      rounded-full blur-3xl opacity-40
                      bg-[radial-gradient(circle,#b0623f_0%,transparent_60%)]"
           style={{ animation: 'aurora-a 24s ease-in-out infinite' }} />
      <div className="aurora-blob absolute top-1/4 right-0 w-[60vw] h-[60vw]
                      rounded-full blur-3xl opacity-30
                      bg-[radial-gradient(circle,#7a8f6a_0%,transparent_60%)]"
           style={{ animation: 'aurora-b 30s ease-in-out infinite' }} />
      <div className="aurora-blob absolute bottom-0 left-1/4 w-[55vw] h-[55vw]
                      rounded-full blur-3xl opacity-30
                      bg-[radial-gradient(circle,#c9a15b_0%,transparent_60%)]"
           style={{ animation: 'aurora-c 36s ease-in-out infinite' }} />
      {/* Fine starfield grain to add depth */}
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none
                      bg-[radial-gradient(white_1px,transparent_1px)]
                      [background-size:3px_3px]" />

      <div className="relative z-10 max-w-md">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-terracotta-500 flex items-center
                          justify-center font-serif text-xl">A</div>
          <span className="font-serif text-2xl">Aurzo</span>
        </div>
        <h2 className="font-serif text-5xl leading-tight mb-3">
          The people who matter,<br/>remembered with care.
        </h2>
        <p className="text-charcoal-300 text-lg max-w-sm">
          Your private relationship intelligence — across every Aurzo platform.
        </p>
      </div>
    </aside>
  );
}

const inputCls = [
  'w-full rounded-journal px-3 py-2.5',
  'bg-charcoal-900/70 border border-charcoal-700',
  'text-cream-50 placeholder-charcoal-400',
  'focus:outline-none focus:border-terracotta-500 focus:ring-2 focus:ring-terracotta-500/30',
].join(' ');

function Field(props: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wider text-charcoal-300">{props.label}</span>
      <div className="mt-1.5">{props.children}</div>
    </label>
  );
}

function Banner(props: { tone: 'warn' | 'info' | 'success'; children: React.ReactNode }) {
  const toneCls = {
    warn:    'bg-gold-900/20 border-gold-700/40 text-gold-200',
    info:    'bg-charcoal-800/60 border-charcoal-700 text-charcoal-200',
    success: 'bg-terracotta-900/30 border-terracotta-700/50 text-terracotta-100',
  }[props.tone];
  return (
    <div role="status"
      className={`text-sm rounded-journal border px-3 py-2 mb-4 ${toneCls}`}>
      {props.children}
    </div>
  );
}

function friendlyError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err ?? '');
  const low = raw.toLowerCase();
  if (low.includes('invalid login credentials') || low.includes('invalid') && low.includes('password'))
    return 'That email or password doesn\'t match what we have on file.';
  if (low.includes('email not confirmed'))
    return 'Your email isn\'t confirmed yet — check your inbox for the confirmation link.';
  if (low.includes('failed to fetch') || low.includes('network'))
    return 'We couldn\'t reach the sign-in service. Check your connection and try again.';
  if (low.includes('rate') || low.includes('too many'))
    return 'Too many attempts. Give it a minute before trying again.';
  return raw || 'Something went wrong. Please try again.';
}
