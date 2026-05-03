import { supabase } from '../supabase';
import { PLATFORM_KEY } from './config';

// All Aurzo cross-platform RPCs live in the public schema of the shared
// Supabase project. Force the schema explicitly so this module works even
// when the local supabase client is configured against a different schema.
const pub = () => (supabase as any).schema('public');

export async function hasPlatformAccess(): Promise<boolean> {
  const { data, error } = await pub().rpc('me_has_platform_access', {
    p_platform: PLATFORM_KEY,
  });
  return error ? false : !!data;
}

export async function getPlatformUI(): Promise<any> {
  const { data } = await pub().rpc('get_platform_ui', {
    p_platform: PLATFORM_KEY,
  });
  return data;
}

export async function getOnboardingStatus(): Promise<any> {
  const { data } = await pub().rpc('get_onboarding_status', {
    p_platform: PLATFORM_KEY,
  });
  return data;
}

export async function startOnboarding(t: number) {
  return pub().rpc('start_onboarding', {
    p_platform: PLATFORM_KEY,
    p_total_steps: t,
  });
}

export async function saveOnboardingStep(
  s: number,
  a: Record<string, any>,
) {
  return pub().rpc('save_onboarding_step', {
    p_platform: PLATFORM_KEY,
    p_step: s,
    p_answers: a,
  });
}

export async function completeOnboarding(a: Record<string, any>) {
  return pub().rpc('complete_onboarding', {
    p_platform: PLATFORM_KEY,
    p_answers: a,
  });
}

export async function getUserSettings(): Promise<any> {
  const { data } = await pub().rpc('get_user_settings');
  return data;
}

export async function signOutToMembership(url: string) {
  try {
    await (supabase as any).auth.signOut();
  } catch {
    /* ignore — we still want to send the user to the portal */
  }
  if (typeof window !== 'undefined') window.location.href = url;
}
