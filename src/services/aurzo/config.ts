// Aurzo-suite configuration. The platform id is the same string the
// membership portal uses to identify apps in aurzo_core.apps. Allow
// env override so per-environment overrides are possible; default to
// 'relationships' for this app.

export const MEMBERSHIP_URL =
  (import.meta.env.VITE_MEMBERSHIP_PORTAL_URL as string | undefined) ||
  'https://morning-growth-loop.vercel.app';

export const PLATFORM_KEY =
  (import.meta.env.VITE_PLATFORM_ID as string | undefined) || 'relationships';

export const PLATFORM_LABEL = 'Aurzo Relationship OS';

export const PLATFORM_TAGLINE =
  'Remember the people who matter. Show up better, every week.';

export const membershipSignupUrl = () => {
  const o = typeof window !== 'undefined' ? window.location.origin : '';
  return `${MEMBERSHIP_URL}/signup?return=${encodeURIComponent(
    o,
  )}&platform=${encodeURIComponent(PLATFORM_LABEL)}`;
};

export const membershipDashboardUrl = () => `${MEMBERSHIP_URL}/dashboard`;
export const membershipPasswordUrl = () =>
  `${MEMBERSHIP_URL}/dashboard/settings`;
