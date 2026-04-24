// Unified Aurzo platform config for Relationship OS.
//
// Membership / identity lives in the shared Aurzo membership portal.
// Signup, billing, and password changes all happen there so that every
// Aurzo product (Relationships, Health, Finance, Parenting, …) shares
// one identity and entitlements surface.

export const MEMBERSHIP_URL =
  (import.meta.env.VITE_MEMBERSHIP_PORTAL_URL as string | undefined) ||
  'https://morning-growth-loop.vercel.app';

export const PLATFORM_KEY = 'relationships';
export const PLATFORM_LABEL = 'Aurzo Relationship OS';
export const PLATFORM_TAGLINE = 'Strong relationships, by design.';

export function membershipSignupUrl() {
  const o = typeof window !== 'undefined' ? window.location.origin : '';
  return `${MEMBERSHIP_URL}/signup?return=${encodeURIComponent(o)}&platform=${encodeURIComponent(PLATFORM_LABEL)}`;
}

export function membershipDashboardUrl() {
  return `${MEMBERSHIP_URL}/dashboard`;
}

export function membershipPasswordUrl() {
  return `${MEMBERSHIP_URL}/dashboard/settings`;
}
