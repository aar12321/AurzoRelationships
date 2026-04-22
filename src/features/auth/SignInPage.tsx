import { useState } from 'react';
import { signInWithAurzoSSO, signInWithEmail } from '@/services/auth';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signInWithEmail(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-full flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-md card-journal animate-bloom">
        <h1 className="text-3xl mb-2">Welcome to Aurzo</h1>
        <p className="text-charcoal-500 mb-6">
          A quiet place for the people who matter most.
        </p>

        {sent ? (
          <p className="text-charcoal-700">
            Check your email — we just sent you a sign-in link.
          </p>
        ) : (
          <form onSubmit={handleMagicLink} className="space-y-4">
            <label className="block">
              <span className="text-sm text-charcoal-500">Email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-journal border border-cream-200
                           bg-ivory-50 px-3 py-2 text-charcoal-900
                           focus:outline-none focus:border-terracotta-500"
                placeholder="you@example.com"
              />
            </label>

            <button type="submit" className="btn-primary w-full" disabled={busy}>
              {busy ? 'Sending…' : 'Send magic link'}
            </button>

            <div className="flex items-center gap-3 text-xs text-charcoal-500">
              <span className="flex-1 h-px bg-cream-200" />
              or
              <span className="flex-1 h-px bg-cream-200" />
            </div>

            <button
              type="button"
              onClick={() => void signInWithAurzoSSO()}
              className="btn-ghost w-full border border-cream-200"
            >
              Continue with Aurzo SSO
            </button>

            {error && <p className="text-sm text-terracotta-700">{error}</p>}
          </form>
        )}
      </div>
    </main>
  );
}
