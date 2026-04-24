import { useEffect, useState } from 'react';
import { useCommandPaletteStore } from '@/stores/commandPaletteStore';

// Header button that opens the command palette. Shows ⌘K on macOS, Ctrl+K
// elsewhere. On narrow viewports it collapses to a magnifier icon to keep
// the mobile header uncluttered.

export default function CommandPaletteTrigger() {
  const open = useCommandPaletteStore((s) => s.openPalette);
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      setIsMac(/Mac|iPod|iPhone|iPad/.test(navigator.platform));
    }
  }, []);

  return (
    <button
      onClick={open}
      aria-label="Open command palette"
      data-tour-global="command-palette"
      className="inline-flex items-center gap-2 rounded-journal border border-cream-200
                 dark:border-charcoal-700 bg-ivory-50 dark:bg-charcoal-800
                 px-2.5 py-1.5 text-xs text-charcoal-500 dark:text-charcoal-300
                 hover:bg-cream-100 dark:hover:bg-charcoal-700 transition-colors"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" strokeWidth="2" strokeLinecap="round"
           strokeLinejoin="round" aria-hidden>
        <circle cx="11" cy="11" r="7" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <span className="hidden sm:inline">Search</span>
      <kbd className="hidden sm:inline-flex items-center font-mono
                      text-[10px] rounded border border-cream-200
                      dark:border-charcoal-700 px-1 py-0.5
                      bg-cream-50 dark:bg-charcoal-900">
        {isMac ? '⌘' : 'Ctrl'}K
      </kbd>
    </button>
  );
}
