import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '@/services/supabase';
import {
  getOnboardingStatus,
  hasPlatformAccess,
} from './auth';
import { membershipSignupUrl } from './config';

type GateState =
  | { kind: 'loading' }
  | { kind: 'no-session' }
  | { kind: 'no-access' }
  | { kind: 'needs-onboarding' }
  | { kind: 'ready' };

type Props = { children: React.ReactNode };

// AurzoAuthGate — unified gate for all Aurzo Relationship OS pages.
//
// Flow:
//   1. No Supabase session      → /login
//   2. Session but no platform  → bounce to membership signup portal
//      access                     (the only place signups happen)
//   3. Access but not onboarded → /onboarding
//   4. Ready                    → render children
export default function AurzoAuthGate({ children }: Props) {
  const [state, setState] = useState<GateState>({ kind: 'loading' });
  const location = useLocation();

  useEffect(() => {
    let cancelled = false;

    async function evaluate() {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;

      if (!data.session) {
        setState({ kind: 'no-session' });
        return;
      }

      const access = await hasPlatformAccess();
      if (cancelled) return;
      if (!access) {
        setState({ kind: 'no-access' });
        return;
      }

      const status = await getOnboardingStatus();
      if (cancelled) return;
      if (!status.completed) {
        setState({ kind: 'needs-onboarding' });
        return;
      }

      setState({ kind: 'ready' });
    }

    void evaluate();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      setState({ kind: 'loading' });
      void evaluate();
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [location.pathname]);

  if (state.kind === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ivory-50">
        <div className="text-charcoal-500 text-sm">Loading…</div>
      </div>
    );
  }

  if (state.kind === 'no-session') {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (state.kind === 'no-access') {
    if (typeof window !== 'undefined') {
      window.location.replace(membershipSignupUrl());
    }
    return (
      <div className="min-h-screen flex items-center justify-center bg-ivory-50">
        <div className="text-charcoal-500 text-sm">
          Redirecting to Aurzo membership…
        </div>
      </div>
    );
  }

  if (state.kind === 'needs-onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
