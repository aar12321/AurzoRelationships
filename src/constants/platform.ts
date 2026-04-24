// Every row we write to the universal aurzo_core tables (ai_cache,
// search_history, user_selections) is scoped by this identifier. Reads
// filter on it too, so data from one Aurzo platform never bleeds into
// another. Defaults to 'relationship_os' for this app; override via
// VITE_PLATFORM_ID if the deploy is running under a different identity.

export const PLATFORM_ID: string =
  (import.meta.env.VITE_PLATFORM_ID as string | undefined) ?? 'relationship_os';
