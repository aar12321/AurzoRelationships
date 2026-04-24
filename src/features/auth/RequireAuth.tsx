import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

type Props = { children: React.ReactNode };

export default function RequireAuth({ children }: Props) {
  const { session, loading, initialize } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    void initialize().then((fn) => { cleanup = fn; });
    return () => cleanup?.();
  }, [initialize]);

  if (loading) return <AuthLoadingScreen />;
  if (!session) return <Navigate to="/login" replace state={{ from: location }} />;
  return <>{children}</>;
}

// Warm centered mark with a gentle pulse. Kept deliberately minimal — a
// full app-shell skeleton would flash the wrong layout (desktop vs mobile
// isn't resolved yet at this point in the tree) and feels fussy for a
// sub-second check in the common case.
function AuthLoadingScreen() {
  return (
    <main
      role="status"
      aria-live="polite"
      aria-label="Loading your session"
      className="min-h-screen flex flex-col items-center justify-center gap-4
                 bg-ivory-50 dark:bg-charcoal-950"
    >
      <div
        className="w-14 h-14 rounded-2xl bg-terracotta-600 dark:bg-terracotta-500
                   flex items-center justify-center shadow-warm-dark animate-pulse"
        aria-hidden
      >
        <span className="font-serif text-3xl leading-none text-ivory-50">A</span>
      </div>
      <p className="text-sm text-charcoal-500 dark:text-charcoal-300">
        Finding your people…
      </p>
    </main>
  );
}
