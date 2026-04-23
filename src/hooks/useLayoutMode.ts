import { useEffect, useState } from 'react';
import {
  readLayoutPref,
  resolveLayoutMode,
  type LayoutMode,
  type LayoutPref,
} from '@/services/layoutModeService';

// Returns the *resolved* layout mode (mobile | desktop) plus the raw pref.
// Re-resolves on window resize when pref='auto', and on the 'aurzo-layout-pref'
// custom event when the user changes the setting.

export function useLayoutMode(): { mode: LayoutMode; pref: LayoutPref } {
  const [pref, setPref] = useState<LayoutPref>(() => readLayoutPref());
  const [mode, setMode] = useState<LayoutMode>(() => resolveLayoutMode(readLayoutPref()));

  useEffect(() => {
    function reresolve() { setMode(resolveLayoutMode(readLayoutPref())); }
    function onPrefChange(e: Event) {
      const next = (e as CustomEvent<LayoutPref>).detail ?? readLayoutPref();
      setPref(next);
      setMode(resolveLayoutMode(next));
    }
    window.addEventListener('resize', reresolve);
    window.addEventListener('aurzo-layout-pref', onPrefChange as EventListener);
    return () => {
      window.removeEventListener('resize', reresolve);
      window.removeEventListener('aurzo-layout-pref', onPrefChange as EventListener);
    };
  }, []);

  return { mode, pref };
}
