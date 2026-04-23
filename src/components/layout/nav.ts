// Shared navigation items used by both DesktopShell (sidebar) and
// MobileShell (bottom tabs + More drawer).
//
// `primary: true` means the item is worth a slot in the bottom tab bar.
// Everything else spills into the "More" drawer on mobile.

export type NavItem = {
  to: string;
  label: string;
  primary?: boolean;
  icon?: string;         // emoji glyph; the mobile shell uses these
  exact?: boolean;       // use `end` on the NavLink for exact match
};

export const NAV_ITEMS: NavItem[] = [
  { to: '/relationships',          label: 'Home',      primary: true, icon: '🏡', exact: true },
  { to: '/relationships/today',    label: 'Today',     primary: true, icon: '☀️' },
  { to: '/relationships/people',   label: 'People',    primary: true, icon: '👥' },
  { to: '/relationships/map',      label: 'Map',       primary: true, icon: '🗺️' },
  { to: '/relationships/dates',    label: 'Dates',     icon: '📅' },
  { to: '/relationships/health',   label: 'Health',    icon: '💗' },
  { to: '/relationships/forecast', label: 'Forecast',  icon: '📈' },
  { to: '/relationships/events',   label: 'Events',    icon: '🎉' },
  { to: '/relationships/gifts',    label: 'Gifts',     icon: '🎁' },
  { to: '/relationships/memories', label: 'Memories',  icon: '📸' },
  { to: '/relationships/couples',  label: 'Couples',   icon: '💞' },
  { to: '/relationships/advisor',  label: 'Advisor',   icon: '✨' },
  { to: '/relationships/settings', label: 'Settings',  icon: '⚙️' },
];
