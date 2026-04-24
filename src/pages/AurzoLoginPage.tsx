import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/services/supabase';
import {
  PLATFORM_LABEL,
  PLATFORM_TAGLINE,
  membershipSignupUrl,
} from '@/services/aurzo/config';

// Two-pane Aurzo Relationship OS login.
// - Left pane: brand / tagline / warm illustration feel
// - Right pane: email + password sign-in, or magic link
// Signups are NOT here — they live in the shared membership portal.
export default function AurzoLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [magicSent, setMagicSent] = useState(false);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate('/relationships', { replace: true });
    });
  }, [navigate]);

  async function handlePasswordSignIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      navigate('/relationships', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in.');
    } finally {
      setBusy(false);
    }
  }

  async function handleMagicLink() {
    if (!email) {
      setError('Enter your email first to receive a magic link.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.origin + '/relationships' },
      });
      if (error) throw error;
      setMagicSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send link.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen w-full grid md:grid-cols-2 bg-ivory-50 text-charcoal-900">
      {/* Left — brand pane */}
      <aside className="relative hidden md:flex flex-col justify-between p-12 bg-gradient-to-br from-terracotta-500/90 via-terracotta-700/80 to-charcoal-900 text-cream-50">
        <div>
          <div className="text-sm uppercase tracking-[0.2em] opacity-80">Aurzo</div>
          <h1 className="mt-6 text-5xl font-serif leading-tight">
            {PLATFORM_LABEL}
          </h1>
          <p className="mt-4 text-lg opacity-90 max-w-md">{PLATFORM_TAGLINE}</p>
        </div>
        <blockquote className="text-cream-100/90 max-w-md">
          <p className="italic">
            "The quality of your life is the quality of your relationships."
          </p>
          <p className="mt-3 text-sm opacity-70">A quiet companion for the people who matter most.</p>
        </blockquote>
      </aside>

      {/* Right — form pane */}
      <section className="flex items-center justify-center p-8 md:p-16">
        <div className="w-full max-w-md">
          <div className="md:hidden mb-8">
            <div className="text-xs uppercase tracking-[0.2em] text-charcoal-500">Aurzo</div>
            <h1 className="mt-2 text-3xl font-serif">{PLATFORM_LABEL}</h1>
            <p className="mt-1 text-charcoal-500">{PLATFORM_TAGLINE}</p>
          </div>

          <h2 className="text-2xl font-serif mb-2">Welcome back</h2>
          <p className="text-charcoal-500 mb-8">
            Sign in to continue tending the relationships that matter most.
          </p>

          {magicSent ? (
            <div className="rounded-journal border border-cream-200 bg-cream-50 p-6">
              <h3 className="font-serif text-lg mb-1">Check your email</h3>
              <p className="text-sm text-charcoal-500">
                We just sent a sign-in link to <span className="font-medium">{email}</span>.
              </p>
            </div>
          ) : (
            <form onSubmit={handlePasswordSignIn} className="space-y-4">
              <label className="block">
                <span className="text-sm text-charcoal-500">Email</span>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-journal border border-cream-200 bg-white px-3 py-2 text-charcoal-900 focus:outline-none focus:border-terracotta-500"
                  placeholder="you@example.com"
                />
              </label>

              <label className="block">
                <span className="text-sm text-charcoal-500">Password</span>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full rounded-journal border border-cream-200 bg-white px-3 py-2 text-charcoal-900 focus:outline-none focus:border-terracotta-500"
                  placeholder="••••••••"
                />
              </label>

              <button
                type="submit"
                disabled={busy}
                className="btn-primary w-full rounded-journal bg-terracotta-700 hover:bg-terracotta-800 text-cream-50 py-2.5 font-medium disabled:opacity-60"
              >
                {busy ? 'Signing in…' : 'Sign in'}
              </button>

              <div className="flex items-center gap-3 text-xs text-charcoal-500">
                <span className="flex-1 h-px bg-cream-200" />
                or
                <span className="flex-1 h-px bg-cream-200" />
              </div>

              <button
                type="button"
                onClick={handleMagicLink}
                disabled={busy}
                className="w-full rounded-journal border border-cream-200 bg-white hover:bg-cream-50 py-2.5 font-medium text-charcoal-900 disabled:opacity-60"
              >
                Email me a magic link
              </button>

              {error && <p className="text-sm text-terracotta-700">{error}</p>}
            </form>
          )}

          <div className="mt-8 pt-6 border-t border-cream-200 text-sm text-charcoal-500 flex flex-col gap-2">
            <div>
              New to Aurzo?{' '}
              <a
                href={membershipSignupUrl()}
                className="text-terracotta-700 hover:underline font-medium"
              >
                Create your membership
              </a>
            </div>
            <div>
              Need to update your password?{' '}
              <a
                href="https://morning-growth-loop.vercel.app/dashboard/settings"
                className="text-terracotta-700 hover:underline"
              >
                Manage in membership portal
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
