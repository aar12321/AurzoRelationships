import { supabase } from './supabase';
import type { Session, User } from '@supabase/supabase-js';

export type AuthCallback = (session: Session | null) => void;

export async function getSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function getUser(): Promise<User | null> {
  const { data } = await supabase.auth.getUser();
  return data.user;
}

export function onAuthChange(cb: AuthCallback): () => void {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => cb(session));
  return () => data.subscription.unsubscribe();
}

export async function signInWithEmail(email: string): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin + '/relationships' },
  });
  if (error) throw error;
}

// Aurzo SSO entry point — the shared Aurzo auth server issues a session
// via OAuth. Module 1 wires the redirect; the provider is registered in
// the Supabase dashboard when Aurzo SSO is live.
export async function signInWithAurzoSSO(): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin + '/relationships',
    },
  });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}
