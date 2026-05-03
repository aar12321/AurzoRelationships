// friendlyError — translates raw Supabase / Postgrest / network errors into
// short user-readable sentences. Every save form on the site routes errors
// through here so the user gets actionable guidance ("Add a name first")
// instead of opaque codes ("PGRST116", "23502", "Failed to fetch").

type SupabaseLikeError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
  status?: number;
  statusText?: string;
};

const PGCODE_LABEL: Record<string, string> = {
  '23502': 'A required field is empty.',
  '23503': 'This references something that no longer exists. Refresh and try again.',
  '23505': 'That already exists.',
  '23514': "One of the values doesn't fit the expected format.",
  '42501': "You don't have permission to do that.",
  '42P01': 'The data table is missing — the app may need a refresh.',
  '22P02': "One of the values isn't in the right format (e.g. a date or number).",
  '22001': 'One of your inputs is too long.',
  PGRST116: 'No matching record was found.',
  PGRST301: 'You need to sign in again — your session expired.',
};

export function friendlyError(err: unknown, fallback = 'Something went wrong.'): string {
  if (!err) return fallback;
  const e = err as SupabaseLikeError;
  const raw = (e.message ?? String(err) ?? '').trim();
  const low = raw.toLowerCase();

  if (e.code && PGCODE_LABEL[e.code]) {
    const base = PGCODE_LABEL[e.code];
    const detail = e.details ?? e.hint;
    return detail ? `${base} (${detail})` : base;
  }

  if (low.includes('not acceptable') || raw.includes('406')) {
    return "We couldn't read that table. Try refreshing the page — if it keeps happening, contact support.";
  }
  if (low.includes('jwt') || low.includes('unauthorized') || raw.includes('401')) {
    return 'Your session expired. Sign in again to continue.';
  }
  if (low.includes('row-level security') || low.includes('rls')) {
    return "You don't have permission to do that.";
  }
  if (low.includes('failed to fetch') || low.includes('network')) {
    return "We couldn't reach the server. Check your connection and try again.";
  }
  if (low.includes('rate') || low.includes('too many')) {
    return 'You\'re going faster than the server can keep up. Wait a moment and retry.';
  }
  if (low.includes('payload too large') || low.includes('413')) {
    return 'That file is too large. Try one under 10 MB.';
  }
  if (low.includes('invalid mime') || low.includes('unsupported')) {
    return 'That file type isn\'t supported.';
  }
  return raw || fallback;
}
