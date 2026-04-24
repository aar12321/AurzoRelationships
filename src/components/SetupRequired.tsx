// Shown instead of the app when the bundle was built without Supabase
// credentials. Nothing else in the app can function without them, so a
// dedicated screen with precise instructions is friendlier than the
// "Failed to fetch" red text a user would otherwise see on sign-in.

const VARS = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];

export default function SetupRequired() {
  return (
    <main className="min-h-screen bg-ivory-50 dark:bg-charcoal-950
                     text-charcoal-900 dark:text-cream-50
                     flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-xl card-journal animate-bloom">
        <div className="text-3xl mb-2">🔧</div>
        <h1 className="text-3xl mb-2">Setup required.</h1>
        <p className="text-charcoal-500 dark:text-charcoal-300 mb-5">
          Aurzo couldn't find its Supabase credentials in this build. The app
          needs these two environment variables baked in at build time:
        </p>

        <ul className="rounded-journal bg-cream-50 dark:bg-charcoal-900
                       border border-cream-200 dark:border-charcoal-800
                       p-3 mb-5 font-mono text-sm space-y-1">
          {VARS.map((v) => <li key={v}>{v}</li>)}
        </ul>

        <div className="space-y-4 text-sm text-charcoal-700 dark:text-charcoal-200">
          <section>
            <h2 className="font-serif text-lg mb-1">On Replit</h2>
            <ol className="list-decimal pl-5 space-y-1">
              <li>Open the <strong>Secrets</strong> panel (🔒 in the left sidebar).</li>
              <li>Add both keys — values are in <code className="font-mono">.env.example</code>.</li>
              <li>Re-publish the deployment. Replit re-runs <code className="font-mono">npm run build</code> with the secrets present.</li>
            </ol>
          </section>

          <section>
            <h2 className="font-serif text-lg mb-1">Locally</h2>
            <ol className="list-decimal pl-5 space-y-1">
              <li>Copy <code className="font-mono">.env.example</code> to <code className="font-mono">.env</code>.</li>
              <li>Restart <code className="font-mono">npm run dev</code> — Vite only reads env files at server start.</li>
            </ol>
          </section>
        </div>

        <p className="text-xs text-charcoal-500 dark:text-charcoal-300 mt-6">
          Vite inlines <code className="font-mono">import.meta.env.VITE_*</code> at build time,
          so runtime env changes alone won't fix this — a rebuild is required.
        </p>
      </div>
    </main>
  );
}
