// Small generic confirm dialog. Used for sign-out today; will grow to
// cover any destructive action (delete person, delete memory, remove
// couple link). Keeps Apple-ish manners — ESC to dismiss, focus lands
// on the confirm button so Enter commits, backdrop click cancels,
// role=dialog + aria-modal for AT users.

import { useEffect, useRef } from 'react';

type Props = {
  open: boolean;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'default' | 'danger';
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmModal({
  open, title, description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'default',
  busy = false,
  onConfirm, onCancel,
}: Props) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    // Focus the primary CTA so Enter commits the action. A full focus trap
    // would be overkill for a two-button dialog; tab order already loops
    // between confirm + cancel naturally.
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) { e.preventDefault(); onCancel(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, busy, onCancel]);

  if (!open) return null;

  const confirmCls = tone === 'danger'
    ? 'bg-terracotta-700 hover:bg-terracotta-600 text-ivory-50'
    : 'bg-terracotta-500 hover:bg-terracotta-400 text-ivory-50';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      onClick={() => !busy && onCancel()}
      className="fixed inset-0 z-50 flex items-center justify-center p-4
                 bg-charcoal-950/60 backdrop-blur-sm animate-bloom"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm card-journal"
      >
        <h2 id="confirm-title" className="font-serif text-2xl mb-2">{title}</h2>
        {description && (
          <div className="text-sm text-charcoal-500 dark:text-charcoal-300 mb-5">
            {description}
          </div>
        )}
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={busy}
            className="btn-ghost border border-cream-200 dark:border-charcoal-700 text-sm"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            disabled={busy}
            className={`rounded-journal px-4 py-2 text-sm font-medium
                       transition-colors disabled:opacity-50 ${confirmCls}`}
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
