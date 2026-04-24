// Keyboard shortcuts reference. Opened with `?`, matching Linear / GitHub
// muscle memory. Every shortcut the app supports should have a row here —
// if it's listed, it works; if it works, it's listed.

import { useEffect } from 'react';
import { useShortcutsStore } from '@/stores/shortcutsStore';

type Row = { keys: string[]; label: string };
type Group = { title: string; rows: Row[] };

const GROUPS: Group[] = [
  {
    title: 'Navigate',
    rows: [
      { keys: ['⌘', 'K'],  label: 'Open the command palette' },
      { keys: ['Ctrl', 'K'], label: 'Open the command palette (Windows / Linux)' },
      { keys: ['/'],         label: 'Open the command palette (quick)' },
      { keys: ['?'],         label: 'Show this shortcuts list' },
    ],
  },
  {
    title: 'Inside menus & dialogs',
    rows: [
      { keys: ['↑', '↓'],    label: 'Move between command palette results' },
      { keys: ['Enter'],     label: 'Activate the highlighted result / confirm dialog' },
      { keys: ['Esc'],       label: 'Close the current overlay' },
      { keys: ['←', '→'],    label: 'Back / forward in the feature tour' },
    ],
  },
];

export default function ShortcutsOverlay() {
  const { open, close } = useShortcutsStore();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, close]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-title"
      onClick={close}
      className="fixed inset-0 z-[65] flex items-center justify-center p-4
                 bg-charcoal-950/60 backdrop-blur-sm animate-bloom"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg card-journal"
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <h2 id="shortcuts-title" className="font-serif text-2xl">Keyboard shortcuts</h2>
          <button onClick={close} aria-label="Close shortcuts"
            className="text-charcoal-500 dark:text-charcoal-300 hover:text-charcoal-900
                       dark:hover:text-cream-50">
            ×
          </button>
        </div>

        <div className="space-y-5">
          {GROUPS.map((g) => (
            <section key={g.title}>
              <div className="text-xs uppercase tracking-wider text-charcoal-500
                              dark:text-charcoal-300 mb-2">
                {g.title}
              </div>
              <ul className="divide-y divide-cream-200 dark:divide-charcoal-700">
                {g.rows.map((r, i) => (
                  <li key={i} className="py-2 flex items-center justify-between gap-3 text-sm">
                    <span>{r.label}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      {r.keys.map((k, ki) => (
                        <kbd key={ki}
                          className="px-1.5 py-0.5 rounded bg-cream-100 dark:bg-charcoal-800
                                     border border-cream-200 dark:border-charcoal-700
                                     text-[11px] font-mono text-charcoal-700 dark:text-cream-100">
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <p className="text-xs text-charcoal-500 dark:text-charcoal-300 mt-5">
          Press <kbd className="px-1 py-0.5 rounded bg-cream-100 dark:bg-charcoal-800
                                border border-cream-200 dark:border-charcoal-700 font-mono">?</kbd>
          {' '}anywhere to open this again.
        </p>
      </div>
    </div>
  );
}
