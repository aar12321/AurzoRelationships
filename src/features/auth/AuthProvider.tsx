// React Context layer the AurzoMorning spec mandates. The Zustand authStore
// is still the source of truth — this provider owns the one-time initialize()
// call, exposes a spec-compliant {user, session, loading, signOut} shape, and
// centralizes the "session vanished unexpectedly" redirect.
//
// Detection rule for "expired": if `session` transitions from truthy to null
// AND the change wasn't triggered by our own signOut(), redirect to
// /login?expired=1. Supabase's autoRefreshToken handles routine refreshes
// silently — a SIGNED_OUT we see here means the refresh token itself is dead.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import type { Session, User } from '@supabase/supabase-js';
import { useAuthStore } from '@/stores/authStore';

type AuthCtx = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { session, user, loading, initialize, logout } = useAuthStore();
  const navigate = useNavigate();

  // Tracks the last-known signed-in state so we can detect when a session
  // silently disappears. Also guards intentional sign-outs from firing the
  // expired-session redirect.
  const hadSession = useRef(false);
  const intentionalSignOut = useRef(false);

  // One-time subscription to Supabase's auth state. RequireAuth used to do
  // this itself, which meant every protected-route remount re-subscribed.
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    void initialize().then((fn) => { cleanup = fn; });
    return () => cleanup?.();
  }, [initialize]);

  useEffect(() => {
    if (loading) return;
    if (session) {
      hadSession.current = true;
      return;
    }
    if (hadSession.current) {
      // Lost a session we previously had.
      hadSession.current = false;
      if (!intentionalSignOut.current) {
        navigate('/login?expired=1', { replace: true });
      }
      intentionalSignOut.current = false;
    }
  }, [session, loading, navigate]);

  const signOut = useCallback(async () => {
    intentionalSignOut.current = true;
    await logout();
    navigate('/login', { replace: true });
  }, [logout, navigate]);

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthCtx {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
