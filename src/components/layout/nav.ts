// Shared navigation items used by both DesktopShell (sidebar) and
// MobileShell (bottom tabs).
//
// Mobile shows a fixed 3-tab shell — Today, Apps, Profile — per product
// spec. The Apps tab opens an in-platform hub of every other surface
// (people / dates / gifts / memories / advisor) so a user can still
// reach everything from a phone without a "More" drawer.
//
// Desktop shows the full DESKTOP_NAV list as a sidebar so power users
// can jump anywhere in one click. Removed in this revision: Couples,
// Dashboard (Today is now the dashboard), Forecast, Map.

export type NavItem = {
  to: string;
  label: string;
  icon: string;
  exact?: boolean;
  description?: string;       // short helper line shown on the Apps hub
};

// Sidebar order on desktop. Today is first because it's the landing
// surface; Settings stays at the bottom.
export const DESKTOP_NAV: NavItem[] = [
  { to: '/relationships',          label: 'Today',    icon: '☀️', exact: true,
    description: 'Your daily ritual — who needs a nudge, what is coming up, who is fading.' },
  { to: '/relationships/people',   label: 'People',   icon: '👥',
    description: 'Everyone you care about. Add, edit, see how often you connect.' },
  { to: '/relationships/dates',    label: 'Dates',    icon: '📅',
    description: 'Birthdays, anniversaries, anything you do not want to forget.' },
  { to: '/relationships/events',   label: 'Events',   icon: '🎉',
    description: 'Plan a gathering — guests, tasks, the small details.' },
  { to: '/relationships/gifts',    label: 'Gifts',    icon: '🎁',
    description: 'Save ideas as they come. Get AI shopping help with a budget.' },
  { to: '/relationships/memories', label: 'Memories', icon: '📸',
    description: 'A scrapbook of small moments — searchable, dated, with photos.' },
  { to: '/relationships/health',   label: 'Health',   icon: '💗',
    description: 'See which relationships feel balanced and which need care.' },
  { to: '/relationships/advisor',  label: 'Advisor',  icon: '✨',
    description: 'Talk it through. Specific guidance using everything we know.' },
  { to: '/relationships/settings', label: 'Settings', icon: '⚙️',
    description: 'Notifications, theme, account, retake the tour.' },
];

// Mobile bottom-tabs (exactly three slots).
export const MOBILE_NAV: NavItem[] = [
  { to: '/relationships',          label: 'Home',    icon: '☀️', exact: true },
  { to: '/relationships/apps',     label: 'Apps',    icon: '🧭' },
  { to: '/relationships/settings', label: 'Profile', icon: '🙂' },
];

// Items rendered as cards on the Apps hub (everything except Today,
// which has its own bottom-tab, and Settings, which lives under Profile).
export const APP_HUB_ITEMS: NavItem[] = DESKTOP_NAV.filter(
  (n) => n.to !== '/relationships'
      && n.to !== '/relationships/settings',
);
