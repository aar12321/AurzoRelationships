// Layout mode — 'auto' (follow viewport) / 'mobile' (force) / 'desktop' (force).
// Mirrored into localStorage so the very first paint uses the right shell.
// The user-visible setting lives in SettingsPage.

export type LayoutPref = 'auto' | 'mobile' | 'desktop';
export type LayoutMode = 'mobile' | 'desktop';

const STORAGE_KEY = 'aurzo-layout-mode';
export const MOBILE_BREAKPOINT = 768;

export function readLayoutPref(): LayoutPref {
  if (typeof window === 'undefined') return 'auto';
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v === 'mobile' || v === 'desktop' || v === 'auto' ? v : 'auto';
}

export function writeLayoutPref(pref: LayoutPref): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, pref);
  window.dispatchEvent(new CustomEvent('aurzo-layout-pref', { detail: pref }));
}

export function resolveLayoutMode(pref: LayoutPref): LayoutMode {
  if (pref === 'mobile')  return 'mobile';
  if (pref === 'desktop') return 'desktop';
  if (typeof window === 'undefined') return 'desktop';
  return window.innerWidth < MOBILE_BREAKPOINT ? 'mobile' : 'desktop';
}
