import { useEffect, useRef, useState } from 'react';
import { listApps } from '@/services/coreService';
import type { AurzoApp } from '@/types/core';

const CURRENT_APP = 'relationship_os';

export default function AppSwitcher() {
  const [apps, setApps] = useState<AurzoApp[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void listApps().then(setApps).catch(() => { /* ignore offline */ });
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const current = apps.find((a) => a.id === CURRENT_APP);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-journal px-3 py-1.5
                   hover:bg-cream-200 transition-colors"
        aria-label="Switch Aurzo app"
      >
        <span className="h-2 w-2 rounded-full"
          style={{ backgroundColor: current?.accent_color ?? '#b0623f' }} />
        <span className="font-serif text-base text-charcoal-900">
          {current?.name ?? 'Aurzo'}
        </span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 mt-2 w-64 card-journal z-20 animate-bloom p-2">
          <div className="px-2 py-1 text-[10px] uppercase tracking-wide text-gold-700">
            Your Aurzo apps
          </div>
          {apps.length === 0 ? (
            <div className="px-2 py-3 text-sm text-charcoal-500">Loading apps…</div>
          ) : (
            <ul>
              {apps.map((a) => {
                const isCurrent = a.id === CURRENT_APP;
                return (
                  <li key={a.id}>
                    <a
                      href={a.route}
                      className={[
                        'flex items-start gap-3 px-2 py-2 rounded-journal',
                        isCurrent ? 'bg-cream-100' : 'hover:bg-cream-100',
                      ].join(' ')}
                      onClick={(e) => {
                        if (isCurrent) { e.preventDefault(); setOpen(false); }
                      }}
                    >
                      <span className="h-2 w-2 rounded-full mt-1.5 flex-shrink-0"
                        style={{ backgroundColor: a.accent_color ?? '#b0623f' }} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-charcoal-900">
                          {a.name}
                          {isCurrent && (
                            <span className="ml-2 text-[10px] text-charcoal-500">
                              (you're here)
                            </span>
                          )}
                        </div>
                        {a.tagline && (
                          <div className="text-xs text-charcoal-500 truncate">
                            {a.tagline}
                          </div>
                        )}
                      </div>
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
