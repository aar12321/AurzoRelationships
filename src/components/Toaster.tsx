// Bottom-right stack on desktop, bottom-center on mobile. aria-live=polite
// so screen readers announce new toasts without stealing focus.
//
// Each toast has a matching tonal color (success = gold, error = terracotta,
// info = charcoal) and a small × button. Optional inline action slot is
// handy for undo: toast.success('Memory saved', { action: { label: 'Undo',
// onClick: … } }).

import { useToastStore, type ToastKind } from '@/stores/toastStore';

const TONE: Record<ToastKind, { bg: string; ring: string; icon: string }> = {
  success: {
    bg: 'bg-gold-900/90 text-gold-100',
    ring: 'ring-gold-700/60',
    icon: '✓',
  },
  error: {
    bg: 'bg-terracotta-900/95 text-terracotta-50',
    ring: 'ring-terracotta-700/60',
    icon: '⚠',
  },
  info: {
    bg: 'bg-charcoal-800/95 text-cream-50',
    ring: 'ring-charcoal-600/60',
    icon: 'ℹ',
  },
};

export default function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  if (toasts.length === 0) return null;

  return (
    <div
      role="region"
      aria-live="polite"
      aria-label="Notifications"
      className="fixed z-[60] pointer-events-none
                 bottom-20 left-1/2 -translate-x-1/2 w-[min(92vw,26rem)]
                 sm:bottom-6 sm:right-6 sm:left-auto sm:translate-x-0
                 flex flex-col gap-2"
    >
      {toasts.map((t) => {
        const tone = TONE[t.kind];
        return (
          <div key={t.id}
            className={`pointer-events-auto flex items-start gap-3 px-4 py-3
                        rounded-journal shadow-warm-dark ring-1 backdrop-blur
                        animate-bloom ${tone.bg} ${tone.ring}`}>
            <span aria-hidden className="text-sm leading-5 shrink-0">{tone.icon}</span>
            <span className="flex-1 text-sm leading-5">{t.message}</span>
            {t.action && (
              <button
                onClick={() => { t.action?.onClick(); dismiss(t.id); }}
                className="text-xs underline underline-offset-2 hover:opacity-80 shrink-0"
              >
                {t.action.label}
              </button>
            )}
            <button
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss"
              className="text-sm opacity-60 hover:opacity-100 shrink-0 -mt-0.5"
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
