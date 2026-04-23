import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCommandPaletteStore } from '@/stores/commandPaletteStore';
import { usePeopleStore } from '@/stores/peopleStore';
import { useDatesStore } from '@/stores/datesStore';
import {
  buildCommands,
  groupResults,
  rank,
  type CommandItem,
} from '@/services/commandSearchService';

// Global command palette — ⌘K / Ctrl+K. Single instance, mounted in AppShell.
// The keyboard listener lives in useGlobalHotkeys; this component only handles
// render + within-palette navigation (↑ ↓ Enter Esc).

export default function CommandPalette() {
  const { open, closePalette } = useCommandPaletteStore();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);

  const people = usePeopleStore((s) => s.people);
  const activePersonId = usePeopleStore((s) => s.activePersonId);
  const loadPeople = usePeopleStore((s) => s.loadAll);
  const dates = useDatesStore((s) => s.dates);
  const loadDates = useDatesStore((s) => s.load);

  // Prime the data the palette searches the first time it opens.
  useEffect(() => {
    if (!open) return;
    if (people.length === 0) void loadPeople();
    if (dates.length === 0) void loadDates();
    setQuery('');
    setCursor(0);
    setTimeout(() => inputRef.current?.focus(), 10);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const actions: CommandItem[] = useMemo(() => ([
    { id: 'action:add-person',   kind: 'action', label: 'Add a person',
      hint: 'New profile', to: '/relationships/people/new',
      keywords: ['new', 'create', 'add', 'friend'] },
    { id: 'action:add-date',     kind: 'action', label: 'Add an important date',
      hint: 'Birthday, anniversary…', to: '/relationships/dates',
      keywords: ['new', 'birthday', 'anniversary'] },
    { id: 'action:add-event',    kind: 'action', label: 'Create event',
      hint: 'Gathering, dinner…', to: '/relationships/events/new',
      keywords: ['new', 'gathering', 'party'] },
    { id: 'action:open-advisor', kind: 'action', label: 'Ask the advisor',
      hint: 'AI relationship coach', to: '/relationships/advisor',
      keywords: ['ai', 'chat', 'ask', 'help'] },
    { id: 'action:weekly-pulse', kind: 'action', label: "This week's pulse",
      hint: 'Who to think about', to: '/relationships',
      keywords: ['suggestion', 'sunday'] },
  ]), []);

  const all = useMemo(
    () => buildCommands({ people, dates, actions, activePersonId }),
    [people, dates, actions, activePersonId],
  );
  const ranked = useMemo(() => rank(all, query), [all, query]);
  const groups = useMemo(() => groupResults(ranked), [ranked]);
  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  // Clamp the cursor when results change.
  useEffect(() => {
    if (cursor > flat.length - 1) setCursor(Math.max(0, flat.length - 1));
  }, [flat.length, cursor]);

  function run(it: CommandItem) {
    closePalette();
    if (it.to) navigate(it.to);
    it.run?.();
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { closePalette(); return; }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, flat.length - 1));
      scrollCursorIntoView();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
      scrollCursorIntoView();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const it = flat[cursor];
      if (it) run(it);
    }
  }

  function scrollCursorIntoView() {
    requestAnimationFrame(() => {
      const el = listRef.current?.querySelector<HTMLElement>('[data-cursor="true"]');
      el?.scrollIntoView({ block: 'nearest' });
    });
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:pt-24
                 bg-charcoal-900/40 backdrop-blur-sm
                 dark:bg-charcoal-950/70"
      onClick={closePalette}
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKey}
        className="w-full max-w-xl card-journal p-0 overflow-hidden
                   animate-bloom shadow-warm dark:shadow-warm-dark"
      >
        <div className="border-b border-cream-200 dark:border-charcoal-700 px-4 py-3">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setCursor(0); }}
            placeholder="Search people, pages, or type a command…"
            className="w-full bg-transparent outline-none text-lg
                       placeholder:text-charcoal-300 dark:placeholder:text-charcoal-300"
            aria-label="Command palette search"
          />
        </div>

        <div ref={listRef} className="max-h-[60vh] overflow-y-auto py-2">
          {flat.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-charcoal-500 dark:text-charcoal-300">
              Nothing matches <span className="font-medium">"{query}"</span>.
            </div>
          )}

          {groups.map((g) => (
            <div key={g.kind} className="mb-1">
              <div className="px-4 py-1 text-[11px] uppercase tracking-wider
                              text-charcoal-500 dark:text-charcoal-300">
                {g.title}
              </div>
              <ul>
                {g.items.map((it) => {
                  const i = flat.indexOf(it);
                  const active = i === cursor;
                  return (
                    <li key={it.id}>
                      <button
                        data-cursor={active ? 'true' : undefined}
                        onMouseEnter={() => setCursor(i)}
                        onClick={() => run(it)}
                        className={[
                          'w-full text-left px-4 py-2 flex items-center justify-between',
                          'transition-colors',
                          active
                            ? 'bg-cream-100 dark:bg-charcoal-700'
                            : 'hover:bg-cream-50 dark:hover:bg-charcoal-800',
                        ].join(' ')}
                      >
                        <span className="flex items-center gap-2">
                          <KindDot kind={it.kind} />
                          <span className="text-sm text-charcoal-900 dark:text-cream-50">
                            {it.label}
                          </span>
                        </span>
                        {it.hint && (
                          <span className="text-xs text-charcoal-500 dark:text-charcoal-300 ml-3 truncate">
                            {it.hint}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-cream-200 dark:border-charcoal-700
                        px-4 py-2 flex items-center gap-4 text-[11px]
                        text-charcoal-500 dark:text-charcoal-300">
          <Kbd>↑</Kbd><Kbd>↓</Kbd><span>navigate</span>
          <Kbd>⏎</Kbd><span>open</span>
          <Kbd>esc</Kbd><span>close</span>
        </div>
      </div>
    </div>
  );
}

function KindDot({ kind }: { kind: string }) {
  const color =
    kind === 'action' ? 'bg-terracotta-500'
    : kind === 'person' ? 'bg-gold-500'
    : kind === 'date' ? 'bg-terracotta-300'
    : 'bg-charcoal-500';
  return <span className={`h-1.5 w-1.5 rounded-full ${color}`} aria-hidden />;
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-cream-200 dark:border-charcoal-700
                    bg-cream-50 dark:bg-charcoal-900 px-1.5 py-0.5 text-[10px]
                    font-mono">
      {children}
    </kbd>
  );
}
