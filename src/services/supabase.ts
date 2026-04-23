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

if (!url || !anonKey) {
  console.warn(
    '[aurzo] Supabase env vars missing. Copy .env.example to .env and fill in ' +
      'VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY (or the NEXT_PUBLIC_* equivalents).',
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
