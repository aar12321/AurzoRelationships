import { useEffect, useRef, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { signInWithAurzoSSO, signInWithEmail } from '@/services/auth';
import { useAuthStore } from '@/stores/authStore';

type LocState = { from?: { pathname?: string } };

export default function SignInPage() {
  const { session, loading, initialize } = useAuthStore();
  const location = useLocation();
  const from = (location.state as LocState | null)?.from?.pathname ?? '/relationships';

  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [ssoBusy, setSsoBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    void initialize().then((fn) => { cleanup = fn; });
    return () => cleanup?.();
  }, [initialize]);

  // 60s cooldown after a successful send, counted down each second.
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // Already signed in? Don't linger on /signin — bounce to whatever they
  // were trying to reach (or the dashboard if they came here directly).
  if (!loading && session) return <Navigate to={from} replace />;

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      await signInWithEmail(email.trim());
      setSent(true);
      setCooldown(60);
    } catch (err) {
      setError(friendlyAuthError(err));
      inputRef.current?.focus();
    } finally { setBusy(false); }
  }

  async function resend() {
    if (cooldown > 0 || busy) return;
    setBusy(true); setError(null);
    try {
      await signInWithEmail(email.trim());
      setCooldown(60);
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally { setBusy(false); }
  }

  async function handleSso() {
    setSsoBusy(true); setError(null);
    try { await signInWithAurzoSSO(); }
    catch (err) { setError(friendlyAuthError(err)); setSsoBusy(false); }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-16
                     bg-ivory-50 dark:bg-charcoal-950
                     text-charcoal-900 dark:text-cream-50">
      <div className="w-full max-w-md card-journal animate-bloom">
        <h1 className="text-3xl mb-2">Welcome to Aurzo</h1>
        <p className="text-charcoal-500 dark:text-charcoal-300 mb-6">
          A quiet place for the people who matter most.
        </p>

        {sent ? (
          <SentPanel
            email={email}
            cooldown={cooldown}
            busy={busy}
            onResend={() => void resend()}
            onChangeEmail={() => { setSent(false); setError(null); }}
          />
        ) : (
          <form onSubmit={handleMagicLink} className="space-y-4" noValidate>
            <label className="block">
              <span className="text-sm text-charcoal-500 dark:text-charcoal-300">Email</span>
              <input
                ref={inputRef}
                type="email"
                name="email"
                autoComplete="email"
                inputMode="email"
                spellCheck={false}
                autoCapitalize="off"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={error ? 'true' : undefined}
                aria-describedby={error ? 'signin-error' : undefined}
                className="mt-1 w-full rounded-journal border border-cream-200
                           dark:border-charcoal-700 bg-ivory-50 dark:bg-charcoal-800
                           px-3 py-2 text-charcoal-900 dark:text-cream-50
                           focus:outline-none focus:border-terracotta-500
                           focus:ring-2 focus:ring-terracotta-500/30"
                placeholder="you@example.com"
              />
            </label>

            <button type="submit" className="btn-primary w-full" disabled={busy || !email.trim()}>
              {busy ? 'Sending…' : 'Send magic link'}
            </button>

            <div className="flex items-center gap-3 text-xs text-charcoal-500 dark:text-charcoal-300">
              <span className="flex-1 h-px bg-cream-200 dark:bg-charcoal-700" />
              or
              <span className="flex-1 h-px bg-cream-200 dark:bg-charcoal-700" />
            </div>

            <button
              type="button"
              onClick={() => void handleSso()}
              disabled={ssoBusy}
              className="btn-ghost w-full border border-cream-200 dark:border-charcoal-700"
            >
              {ssoBusy ? 'Opening…' : 'Continue with Aurzo SSO'}
            </button>

            {error && (
              <div id="signin-error" role="alert"
                   className="text-sm text-terracotta-700 dark:text-terracotta-300
                              bg-terracotta-50 dark:bg-terracotta-900/20
                              border border-terracotta-200 dark:border-terracotta-700/40
                              rounded-journal px-3 py-2 flex items-start gap-2">
                <span aria-hidden>⚠</span>
                <span className="flex-1">{error}</span>
              </div>
            )}

            <p className="text-xs text-charcoal-500 dark:text-charcoal-300 pt-1">
              We'll email a one-tap sign-in link. No passwords, ever.
            </p>
          </form>
        )}
      </div>
    </main>
  );
}

function SentPanel(props: {
  email: string;
  cooldown: number;
  busy: boolean;
  onResend: () => void;
  onChangeEmail: () => void;
}) {
  return (
    <div role="status" aria-live="polite" className="space-y-4">
      <div className="text-4xl" aria-hidden>✉️</div>
      <div>
        <h2 className="text-2xl font-serif mb-1">Check your inbox.</h2>
        <p className="text-charcoal-700 dark:text-charcoal-200">
          We sent a sign-in link to <strong className="break-all">{props.email}</strong>.
          Open it on this device to come right back in.
        </p>
      </div>
      <p className="text-xs text-charcoal-500 dark:text-charcoal-300">
        Can't find it? It can take up to a minute — check spam or promotions.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={props.onResend}
          disabled={props.busy || props.cooldown > 0}
          className="btn-ghost border border-cream-200 dark:border-charcoal-700 text-sm"
        >
          {props.cooldown > 0 ? `Resend in ${props.cooldown}s` : props.busy ? 'Sending…' : 'Resend link'}
        </button>
        <button onClick={props.onChangeEmail} className="btn-ghost text-sm">
          Use a different email
        </button>
      </div>
    </div>
  );
}

// Supabase surfaces rate-limit, invalid-email, and network errors with terse
// server codes. Translate the common ones so the user sees something useful.
function friendlyAuthError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err ?? '');
  const low = raw.toLowerCase();
  if (low.includes('failed to fetch') || low.includes('networkerror')) {
    return "We couldn't reach the sign-in service. Check your connection and try again.";
  }
  if (low.includes('rate limit') || low.includes('too many')) {
    return "Too many requests. Give it a minute before trying again.";
  }
  if (low.includes('invalid') && low.includes('email')) {
    return "That email doesn't look quite right. Double-check for typos.";
  }
  return raw || 'Something went wrong. Please try again.';
}
