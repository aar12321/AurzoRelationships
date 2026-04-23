import { useEffect } from 'react';
import { useCommandPaletteStore } from '@/stores/commandPaletteStore';

// Global hotkeys. Mount once at the app shell. Currently owns:
//   ⌘K / Ctrl+K  — toggle the command palette
//   /            — open the command palette when no input is focused
//
// Input-focus guard prevents "/" from hijacking typing in real text fields.

export function useGlobalHotkeys(): void {
  const toggle = useCommandPaletteStore((s) => s.togglePalette);
  const open   = useCommandPaletteStore((s) => s.openPalette);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        toggle();
        return;
      }
      if (e.key === '/' && !isTypingInField(e.target)) {
        e.preventDefault();
        open();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggle, open]);
}

function isTypingInField(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  const tag = t.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (t.isContentEditable) return true;
  return false;
}
