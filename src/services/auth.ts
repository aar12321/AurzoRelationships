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

// Email + password auth — the AurzoMorning universal login flow. Signups
// happen on aurzo.com only; this client only signs existing users in.
export async function signInWithPassword(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

// Kicks off Supabase's built-in reset email. The user receives a link that
// lands on /login with a recovery token; Supabase auto-exchanges it for a
// session, after which the user can set a new password in Settings.
export async function sendPasswordReset(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + '/login?reset=1',
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
