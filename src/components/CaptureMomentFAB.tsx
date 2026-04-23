// Capture-moment FAB — always accessible, thumb-reachable on mobile
// (sits above the bottom tab bar) and tucked in the corner on desktop.
// Tap = open the CaptureMomentModal. ⌘K also exposes the same action.

import { useCaptureMomentStore } from '@/stores/captureMomentStore';

export default function CaptureMomentFAB({ bottomOffset }: { bottomOffset?: number }) {
  const open = useCaptureMomentStore((s) => s.openCapture);
  const offset = bottomOffset ?? 24;

  return (
    <button
      onClick={() => open(null)}
      aria-label="Capture a moment"
      title="Capture a moment"
      className="fixed right-5 z-30 w-12 h-12 rounded-full bg-terracotta-600
                 text-ivory-50 shadow-warm dark:shadow-warm-dark
                 hover:bg-terracotta-700 active:scale-95 transition-all
                 flex items-center justify-center"
      style={{ bottom: `calc(${offset}px + env(safe-area-inset-bottom))` }}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" strokeWidth="2" strokeLinecap="round"
           strokeLinejoin="round" aria-hidden>
        <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z" />
        <circle cx="12" cy="13" r="3.5" />
      </svg>
    </button>
  );
}
