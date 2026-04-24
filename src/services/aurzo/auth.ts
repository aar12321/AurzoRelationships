import { supabase } from '@/services/supabase';
import { PLATFORM_KEY } from './config';

// IMPORTANT: the default supabase client in this repo is configured with
// `db: { schema: 'relationship_os' }`. All shared Aurzo membership RPCs
// live in the `public` schema, so every call below MUST hop to public
// via `.schema('public').rpc(...)`.

export type OnboardingStatus = {
  started: boolean;
  completed: boolean;
  current_step?: string | null;
  steps_completed?: string[];
  data?: Record<string, unknown>;
};

export type PlatformUI = {
  theme?: string;
  layout?: string;
  viewport?: 'web' | 'mobile' | 'auto';
  [k: string]: unknown;
};

export type UserSettings = {
  viewport?: 'web' | 'mobile' | 'auto';
  preferences?: Record<string, unknown>;
  [k: string]: unknown;
};

// --- access ----------------------------------------------------------------

export async function hasPlatformAccess(): Promise<boolean> {
  const { data, error } = await supabase
    .schema('public')
    .rpc('me_has_platform_access', { p_platform: PLATFORM_KEY });
  if (error) {
    console.warn('[aurzo] me_has_platform_access failed', error.message);
    return false;
  }
  return Boolean(data);
}

export async function getPlatformUI(): Promise<PlatformUI | null> {
  const { data, error } = await supabase
    .schema('public')
    .rpc('get_platform_ui', { p_platform: PLATFORM_KEY });
  if (error) {
    console.warn('[aurzo] get_platform_ui failed', error.message);
    return null;
  }
  return (data as PlatformUI) ?? null;
}

// --- onboarding ------------------------------------------------------------

export async function getOnboardingStatus(): Promise<OnboardingStatus> {
  const { data, error } = await supabase
    .schema('public')
    .rpc('get_onboarding_status', { p_platform: PLATFORM_KEY });
  if (error) {
    console.warn('[aurzo] get_onboarding_status failed', error.message);
    return { started: false, completed: false };
  }
  return (data as OnboardingStatus) ?? { started: false, completed: false };
}

export async function startOnboarding(): Promise<void> {
  const { error } = await supabase
    .schema('public')
    .rpc('start_onboarding', { p_platform: PLATFORM_KEY });
  if (error) console.warn('[aurzo] start_onboarding failed', error.message);
}

export async function saveOnboardingStep(
  step: string,
  data: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase
    .schema('public')
    .rpc('save_onboarding_step', {
      p_platform: PLATFORM_KEY,
      p_step: step,
      p_data: data,
    });
  if (error) console.warn('[aurzo] save_onboarding_step failed', error.message);
}

export async function completeOnboarding(): Promise<void> {
  const { error } = await supabase
    .schema('public')
    .rpc('complete_onboarding', { p_platform: PLATFORM_KEY });
  if (error) console.warn('[aurzo] complete_onboarding failed', error.message);
}

// --- settings --------------------------------------------------------------

export async function getUserSettings(): Promise<UserSettings> {
  const { data, error } = await supabase
    .schema('public')
    .rpc('get_user_settings', { p_platform: PLATFORM_KEY });
  if (error) {
    console.warn('[aurzo] get_user_settings failed', error.message);
    return {};
  }
  return (data as UserSettings) ?? {};
}

export async function saveUserSettings(settings: UserSettings): Promise<void> {
  const { error } = await supabase
    .schema('public')
    .rpc('save_user_settings', {
      p_platform: PLATFORM_KEY,
      p_settings: settings,
    });
  if (error) console.warn('[aurzo] save_user_settings failed', error.message);
}

// --- session --------------------------------------------------------------

export async function getSessionUser() {
  const { data } = await supabase.auth.getUser();
  return data.user;
}

export async function signOut() {
  await supabase.auth.signOut();
}
