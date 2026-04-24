// Feature tour step definitions. Each step points at a DOM node via a
// `data-tour="<key>"` attribute rendered by the nav shells so the same
// selectors work in both desktop (sidebar) and mobile (bottom tab bar /
// More drawer) modes. Missing targets are skipped silently by the
// renderer — keeps us robust if a nav item is feature-flagged off.

export type TourStep = {
  targetSelector: string;
  title: string;
  icon?: string;
  description: string;
};

export const TOUR_STEPS: TourStep[] = [
  {
    targetSelector: '[data-tour="nav:/relationships"]',
    title: 'Home',
    icon: '🏡',
    description:
      'Your daily pulse — who to reach out to, what’s coming up, and where the quiet spots are.',
  },
  {
    targetSelector: '[data-tour="nav:/relationships/today"]',
    title: 'Today',
    icon: '☀️',
    description:
      'One prioritized feed: today’s dates, unread notifications, and the closest people drifting.',
  },
  {
    targetSelector: '[data-tour="nav:/relationships/people"]',
    title: 'People',
    icon: '👥',
    description:
      'Everyone you’re keeping track of. Tap a person to see their profile, memories, gifts, and messages.',
  },
  {
    targetSelector: '[data-tour="nav:/relationships/map"]',
    title: 'Map',
    icon: '🗺️',
    description:
      'A bird’s-eye view of your network — inner circle at the center, acquaintances on the outer rings.',
  },
  {
    targetSelector: '[data-tour="nav:/relationships/forecast"]',
    title: 'Forecast',
    icon: '📈',
    description:
      'Where your closest relationships are heading over the next 90 days if nothing changes.',
  },
  {
    targetSelector: '[data-tour-global="command-palette"]',
    title: 'Jump anywhere',
    icon: '⌘',
    description:
      'Press ⌘K (or / ) to open the command palette. Add a person, log a memory, or ask the advisor — from anywhere.',
  },
];
