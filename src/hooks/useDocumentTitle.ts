import { useEffect } from 'react';

// Pass a short page name (e.g. "People") and we append the brand suffix.
// Pass null/undefined to reset to the root title. Used by page components
// for dynamic names (person profile, event name) and by <TitleWatcher /> for
// the static route map.

const ROOT = 'Aurzo — Relationship OS';
const SUFFIX = ' · Aurzo';

export function useDocumentTitle(title?: string | null): void {
  useEffect(() => {
    document.title = title ? `${title}${SUFFIX}` : ROOT;
  }, [title]);
}
