import { useEffect } from 'react';
import { useCommandPaletteStore } from '@/stores/commandPaletteStore';
import { useShortcutsStore } from '@/stores/shortcutsStore';

// Global hotkeys. Mount once at the app shell. Currently owns:
//   ⌘K / Ctrl+K  — toggle the command palette
//   /            — open the command palette when no input is focused
//   ?            — toggle the shortcuts cheat-sheet (Linear/GitHub pattern)
//
// Input-focus guard prevents these keys from hijacking real typing.

export function useGlobalHotkeys(): void {
  const toggle = useCommandPaletteStore((s) => s.togglePalette);
  const open   = useCommandPaletteStore((s) => s.openPalette);
  const toggleShortcuts = useShortcutsStore((s) => s.toggle);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        toggle();
        return;
      }
      if (isTypingInField(e.target)) return;
      if (e.key === '/') {
        e.preventDefault();
        open();
      } else if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        // `?` is Shift+/ on US layouts; belt + suspenders for non-US layouts.
        e.preventDefault();
        toggleShortcuts();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggle, open, toggleShortcuts]);
}

function isTypingInField(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  const tag = t.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (t.isContentEditable) return true;
  return false;
}
