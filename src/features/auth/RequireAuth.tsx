import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

type Props = { children: React.ReactNode };

export default function RequireAuth({ children }: Props) {
  const { session, loading, initialize } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    void initialize().then((fn) => {
      cleanup = fn;
    });
    return () => cleanup?.();
  }, [initialize]);

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <div className="text-charcoal-500 text-sm">Loading…</div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/signin" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
