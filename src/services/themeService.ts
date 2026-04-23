// Theme service — applies the user's preference (light / dark / auto) to
// <html> as a `.dark` class that Tailwind's class-based darkMode reads.
//
// The preference lives on aurzo_core.profiles.theme, but that's a signed-in
// read. To avoid a flash of wrong theme on every page load, we mirror the
// latest known preference into localStorage under `aurzo-theme` and apply it
// synchronously before React mounts. The SettingsPage writes through both.

export type ThemePref = 'light' | 'dark' | 'auto';

const STORAGE_KEY = 'aurzo-theme';

export function readStoredTheme(): ThemePref {
  if (typeof window === 'undefined') return 'auto';
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v === 'light' || v === 'dark' || v === 'auto' ? v : 'auto';
}

export function writeStoredTheme(pref: ThemePref): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, pref);
}

function prefersDark(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function applyTheme(pref: ThemePref): void {
  if (typeof document === 'undefined') return;
  const effective = pref === 'auto' ? (prefersDark() ? 'dark' : 'light') : pref;
  const root = document.documentElement;
  if (effective === 'dark') root.classList.add('dark');
  else root.classList.remove('dark');
  root.style.colorScheme = effective;
}

// Subscribe to system theme changes when the preference is 'auto'. Returns
// an unsubscribe function. If the current preference isn't 'auto' the
// listener is installed but simply no-ops, keeping the call cheap and the
// caller unconditional.
let mediaListener: ((e: MediaQueryListEvent) => void) | null = null;

export function initTheme(): void {
  const pref = readStoredTheme();
  applyTheme(pref);
  if (typeof window === 'undefined' || !window.matchMedia) return;
  const mql = window.matchMedia('(prefers-color-scheme: dark)');
  if (mediaListener) mql.removeEventListener('change', mediaListener);
  mediaListener = () => {
    if (readStoredTheme() === 'auto') applyTheme('auto');
  };
  mql.addEventListener('change', mediaListener);
}

// Imperative setter used by the SettingsPage. Persists and applies atomically
// so the UI never drifts from the stored value.
export function setTheme(pref: ThemePref): void {
  writeStoredTheme(pref);
  applyTheme(pref);
}
