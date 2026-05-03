// Listens to route changes and sets the browser tab title from the matching
// NAV_ITEMS entry (or a small static table for routes outside the shell).
// Pages with dynamic names (a person's profile, an event) can still call
// useDocumentTitle() directly — it'll win because it runs after navigation.

import { useLocation } from 'react-router-dom';
import { DESKTOP_NAV, MOBILE_NAV } from '@/components/layout/nav';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

// Longest-prefix-first so /relationships/today wins over /relationships.
// Combine desktop + mobile so /relationships/apps (mobile-only) still
// resolves to "Apps" in the browser tab.
const SORTED_NAV = [...DESKTOP_NAV, ...MOBILE_NAV]
  .sort((a, b) => b.to.length - a.to.length);

const STATIC_TITLES: Record<string, string> = {
  '/signin': 'Sign in',
  '/': 'Home',
};

const SUB_TITLES: { prefix: string; label: string }[] = [
  { prefix: '/relationships/people/new', label: 'Add person' },
  { prefix: '/relationships/events/new', label: 'Create event' },
  { prefix: '/relationships/notifications', label: 'Notifications' },
];

export default function TitleWatcher() {
  const { pathname } = useLocation();

  const explicit =
    STATIC_TITLES[pathname] ??
    SUB_TITLES.find((s) => pathname.startsWith(s.prefix))?.label;

  const navLabel = explicit
    ? null
    : SORTED_NAV.find((i) => (i.exact ? pathname === i.to : pathname.startsWith(i.to)))?.label;

  useDocumentTitle(explicit ?? navLabel ?? null);
  return null;
}
