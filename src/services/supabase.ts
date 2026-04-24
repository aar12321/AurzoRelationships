import { createClient } from '@supabase/supabase-js';

// Relationship OS talks to the shared Aurzo Supabase project. Every Aurzo
// product uses the same project URL + publishable key — that's what makes
// SSO "just work": auth.users is shared, so signing in once produces the
// same user id across apps.

const url =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ??
  (import.meta.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined);

const anonKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ??
  (import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY as string | undefined);

// Consumed by <SetupRequired /> to show a full-screen helper instead of the
// app when the bundle was compiled without real Supabase credentials.
export const supabaseConfigured = Boolean(url && anonKey);

if (!supabaseConfigured) {
  // eslint-disable-next-line no-console
  console.error(
    '[aurzo] Supabase env vars missing at build time. The app will render ' +
      'a setup screen until VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY ' +
      'are provided (Replit: Secrets panel · local: .env).',
  );
}

// Default schema is relationship_os — every table call from this client
// (e.g. supabase.from('people')) resolves inside that schema. For shared
// identity / entitlements / activity, use the coreClient below.
export const supabase = createClient(
  url ?? 'http://localhost:54321',
  anonKey ?? 'public-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'aurzo.auth',
    },
    db: { schema: 'relationship_os' },
  },
);

// Scoped client for the shared aurzo_core schema.
export const coreClient = supabase.schema('aurzo_core');
