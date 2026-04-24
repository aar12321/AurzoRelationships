// Jumps to the top of the page on forward navigation (PUSH / REPLACE),
// but leaves Back navigation (POP) alone so the browser's native scroll
// restoration still works — clicking Back to a long People list returns
// you to exactly where you were.

import { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

export default function ScrollToTop() {
  const { pathname } = useLocation();
  const navType = useNavigationType();

  useEffect(() => {
    if (navType === 'POP') return;
    // Instant rather than smooth so the new page paints from a stable frame —
    // smooth scrolling mid-render produces the "bouncy jump" artifact.
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname, navType]);

  return null;
}
