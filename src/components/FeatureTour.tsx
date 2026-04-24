// Post-onboarding feature tour. Renders a dimmed backdrop with a soft
// highlight ring around the active target and a popover that explains
// what the target does. Keyboard: ← → to navigate, ESC to exit.
//
// Plumbing shipped earlier (services/tourService.ts with the step map,
// stores/tourStore.ts with open/index state, data-tour attributes on
// shells). This file is the overlay itself — it stays a pure renderer
// that reads from the store, so Settings → Retake tour and post-
// onboarding auto-start both work by simply flipping store.start().

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTourStore } from '@/stores/tourStore';
import { TOUR_STEPS } from '@/services/tourService';
import { useAuth } from '@/features/auth/AuthProvider';
import { markTourSeen } from '@/services/coreService';

type Rect = { top: number; left: number; width: number; height: number };

export default function FeatureTour() {
  const { open, index, next, prev, exit } = useTourStore();
  const { user } = useAuth();
  const step = TOUR_STEPS[index];
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Locate and scroll-to the active target. Missing targets are skipped
  // silently per spec ("if a targeted element isn't found, skip that step").
  useLayoutEffect(() => {
    if (!open || !step) return;
    const el = document.querySelector<HTMLElement>(step.targetSelector);
    if (!el) { next(); return; }
    el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    const measure = () => {
      const r = el.getBoundingClientRect();
      setTargetRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    measure();
    const raf = requestAnimationFrame(measure); // after scroll settles
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [open, step, next]);

  // Keyboard nav — matches the spec: ESC dismiss, ← back, → next.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); dismissAndMark(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); advance(); }
      else if (e.key === 'ArrowLeft')  { e.preventDefault(); prev(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, index]);

  async function dismissAndMark() {
    exit();
    if (user) { try { await markTourSeen(user.id); } catch { /* ignore */ } }
  }

  function advance() {
    if (index >= TOUR_STEPS.length - 1) { void dismissAndMark(); }
    else { next(); }
  }

  if (!open || !step || !targetRect) return null;

  const popoverPos = computePopoverPosition(targetRect);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-title"
      className="fixed inset-0 z-[70] animate-bloom"
    >
      {/* Dimmed backdrop, clicking it exits */}
      <div
        onClick={() => void dismissAndMark()}
        className="absolute inset-0 bg-charcoal-950/65 backdrop-blur-[2px]"
      />

      {/* Spotlight ring around the target — no cutout, just a warm outline
          so the content underneath stays readable without fighting the
          backdrop darkness. */}
      <div
        aria-hidden
        className="absolute pointer-events-none rounded-journal ring-4
                   ring-terracotta-400/80 shadow-[0_0_0_9999px_rgba(28,25,22,0.4)]
                   transition-all duration-200"
        style={{
          top: targetRect.top - 6,
          left: targetRect.left - 6,
          width: targetRect.width + 12,
          height: targetRect.height + 12,
        }}
      />

      {/* Popover */}
      <div
        ref={popoverRef}
        className="absolute max-w-sm w-[min(22rem,92vw)] card-journal p-5 animate-bloom"
        style={{ top: popoverPos.top, left: popoverPos.left }}
      >
        <div className="flex items-start gap-3 mb-2">
          {step.icon && <span className="text-2xl leading-none" aria-hidden>{step.icon}</span>}
          <h2 id="tour-title" className="flex-1 font-serif text-xl leading-tight">{step.title}</h2>
          <button
            onClick={() => void dismissAndMark()}
            aria-label="Close tour"
            className="text-charcoal-500 dark:text-charcoal-300 hover:text-charcoal-900
                       dark:hover:text-cream-50 -mt-1"
          >
            ×
          </button>
        </div>
        <p className="text-sm text-charcoal-700 dark:text-charcoal-200 mb-4">
          {step.description}
        </p>
        <div className="flex items-center justify-between text-xs">
          <span className="text-charcoal-500 dark:text-charcoal-300">
            {index + 1} of {TOUR_STEPS.length}
          </span>
          <div className="flex gap-2">
            {index > 0 && (
              <button onClick={prev} className="btn-ghost text-xs">← Back</button>
            )}
            <button onClick={advance} className="btn-primary text-xs">
              {index >= TOUR_STEPS.length - 1 ? 'Got it!' : 'Next →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Place the popover below the target when there's room, otherwise above.
// Flip horizontally so it never clips the viewport edge.
function computePopoverPosition(target: Rect): { top: number; left: number } {
  const PAD = 12;
  const POP_W = 352; // max-w-sm-ish, matches the 22rem cap above
  const POP_H = 180; // rough estimate for off-screen detection

  const spaceBelow = window.innerHeight - (target.top + target.height);
  const below = spaceBelow > POP_H + PAD;
  const top = below
    ? Math.min(window.innerHeight - POP_H - PAD, target.top + target.height + PAD)
    : Math.max(PAD, target.top - POP_H - PAD);

  let left = target.left + target.width / 2 - POP_W / 2;
  left = Math.max(PAD, Math.min(window.innerWidth - POP_W - PAD, left));
  return { top, left };
}
