// Two hooks for search-input consumers. useSearchLogger debounces the
// "executed search" signal so we don't write a row per keystroke — logs
// once the user has paused for ~1.2s and the query is non-trivial. The
// resultCount is captured at log time, matching whatever filtered-count
// the page displays.
//
// useRecentSearches fetches the 5 most recent distinct queries so the
// search input can surface them as suggestions when focused and empty.

import { useEffect, useState } from 'react';
import { logSearch, recentQueries } from '@/services/searchHistoryService';

type LoggerOpts = {
  debounceMs?: number;
  minLength?: number;
  filters?: Record<string, unknown>;
  enabled?: boolean;
};

export function useSearchLogger(
  query: string,
  resultCount: number | null,
  opts: LoggerOpts = {},
): void {
  const { debounceMs = 1200, minLength = 2, filters = {}, enabled = true } = opts;
  useEffect(() => {
    if (!enabled) return;
    const q = query.trim();
    if (q.length < minLength) return;
    const t = setTimeout(() => { void logSearch(q, resultCount, filters); }, debounceMs);
    return () => clearTimeout(t);
    // We intentionally exclude `filters` from deps to avoid logging whenever
    // a parent recreates an object literal; callers should memoize if they
    // want filter-change re-logs.
  }, [query, resultCount, debounceMs, minLength, enabled]); // eslint-disable-line react-hooks/exhaustive-deps
}

export function useRecentSearches(limit = 5): {
  recent: string[];
  refresh: () => Promise<void>;
  loading: boolean;
} {
  const [recent, setRecent] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try { setRecent(await recentQueries(limit)); }
    finally { setLoading(false); }
  }

  useEffect(() => { void refresh(); /* once on mount */ }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { recent, refresh, loading };
}
