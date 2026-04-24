// Slim top banner that surfaces when the browser reports offline. Cheap,
// framework-free, and explains why saves are failing so users don't rage-
// click. Re-check-on-focus catches the case where Chrome missed the
// online/offline event (rare but real on iOS Safari).

import { useEffect, useState } from 'react';

export default function OfflineBanner() {
  const [offline, setOffline] = useState(() =>
    typeof navigator !== 'undefined' ? !navigator.onLine : false,
  );

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    window.addEventListener('focus', update); // iOS Safari catch-up
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
      window.removeEventListener('focus', update);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-0 inset-x-0 z-[80]
                 bg-terracotta-700 text-ivory-50 text-sm text-center px-4 py-2
                 shadow-warm-dark animate-bloom
                 pt-[max(0.5rem,env(safe-area-inset-top))]"
    >
      <span aria-hidden>📡</span> You're offline — changes won't save until you're back.
    </div>
  );
}
