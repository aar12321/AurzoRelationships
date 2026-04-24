// One-click interaction logger. Opens a small popover from the profile
// header with the six interaction kinds; clicking any of them logs a
// "quick check-in" interaction dated now and fires a toast with undo.
//
// Previously the only way to log an interaction was to navigate to a
// dedicated form elsewhere — too many clicks between "I just called mom"
// and "this is captured." Classic dead-automation the audit flagged.

import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useInteractionsStore } from '@/stores/interactionsStore';
import { toast } from '@/stores/toastStore';
import {
  KIND_EMOJI,
  KIND_LABELS,
  type InteractionKind,
} from '@/types/interactions';

const KINDS: InteractionKind[] = ['call', 'text', 'in_person', 'video', 'letter', 'event'];

export default function QuickLogButton({ personId, firstName }: {
  personId: string;
  firstName: string;
}) {
  const { user } = useAuthStore();
  const { log, remove } = useInteractionsStore();
  const [open, setOpen] = useState(false);
  const [busyKind, setBusyKind] = useState<InteractionKind | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!panelRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  async function logKind(kind: InteractionKind) {
    if (!user) return;
    setBusyKind(kind);
    try {
      const row = await log(
        { person_id: personId, kind, quality: 'quick' },
        user.id,
      );
      setOpen(false);
      toast.success(`${KIND_LABELS[kind]} with ${firstName} logged.`, {
        action: {
          label: 'Undo',
          onClick: () => { void remove(row.id); },
        },
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not log.');
    } finally {
      setBusyKind(null);
    }
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="btn-primary text-sm"
      >
        Log contact
      </button>
      {open && (
        <div
          role="menu"
          className="absolute z-20 mt-2 left-0 min-w-[14rem] card-journal p-2
                     animate-bloom"
        >
          <div className="text-[11px] uppercase tracking-wider text-charcoal-500
                          dark:text-charcoal-300 px-2 pb-1">
            Log a quick {firstName.endsWith('s') ? firstName + "'" : firstName + "'s"} check-in
          </div>
          <ul className="grid grid-cols-3 gap-1">
            {KINDS.map((k) => (
              <li key={k}>
                <button
                  role="menuitem"
                  onClick={() => void logKind(k)}
                  disabled={busyKind !== null}
                  className="w-full flex flex-col items-center gap-1 rounded-journal
                             px-2 py-2 text-xs text-charcoal-700 dark:text-cream-100
                             hover:bg-cream-100 dark:hover:bg-charcoal-800
                             disabled:opacity-50 transition-colors"
                >
                  <span className="text-lg leading-none" aria-hidden>{KIND_EMOJI[k]}</span>
                  <span>{busyKind === k ? '…' : KIND_LABELS[k]}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
