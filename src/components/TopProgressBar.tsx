// Thin terracotta bar pinned to the top of the viewport. Fires on every
// route change so the lazy-chunk fetches (and any data-loading the new
// page does) read as "painting" instead of "stuck." Entirely CSS-driven
// and positioned outside any shell so nav chrome doesn't cover it.

import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

export default function TopProgressBar() {
  const { pathname } = useLocation();
  const [active, setActive] = useState(false);

  useEffect(() => {
    // Start the bar; let it grow to its filled state over ~600ms, then
    // fade out. We don't get a real "page ready" signal from Suspense
    // boundaries without more plumbing, but this tuning reads correctly
    // for the typical 100-500ms chunk fetch window.
    setActive(true);
    const done = setTimeout(() => setActive(false), 700);
    return () => clearTimeout(done);
  }, [pathname]);

  return (
    <div
      aria-hidden
      className="fixed top-0 inset-x-0 h-0.5 z-[75] pointer-events-none
                 bg-terracotta-500/20"
      style={{ opacity: active ? 1 : 0, transition: 'opacity 250ms ease-out 300ms' }}
    >
      <div
        className="h-full bg-terracotta-500"
        style={{
          width: active ? '100%' : '0%',
          transition: active
            ? 'width 600ms cubic-bezier(0.2, 0.9, 0.2, 1)'
            : 'width 200ms ease-out',
        }}
      />
    </div>
  );
}
