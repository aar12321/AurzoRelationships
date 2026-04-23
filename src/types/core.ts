// Shared Aurzo identity + entitlement types (aurzo_core schema).
// Other Aurzo apps can copy this file verbatim or publish it as a
// @aurzo/core-types package.

export type AurzoAppId =
  | 'relationship_os'
  | 'subscription_mgr'
  | 'home_mgr'
  | 'womens_health';

export type Tier = 'free' | 'plus' | 'pro' | 'family' | 'lifetime' | 'enterprise';

export type AurzoApp = {
  id: AurzoAppId;
  name: string;
  tagline: string | null;
  description: string | null;
  icon_url: string | null;
  accent_color: string | null;
  route: string;
  is_active: boolean;
  sort_order: number;
};

export type AurzoProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  timezone: string;
  locale: string;
  theme: 'light' | 'dark' | 'auto';
  marketing_opt_in: boolean;
  onboarded_at: string | null;
};

export type AppAccess = {
  user_id: string;
  app_id: AurzoAppId;
  enabled: boolean;
  role: 'user' | 'admin' | 'beta';
  preferences: Record<string, unknown>;
  first_used_at: string | null;
  last_used_at: string | null;
};

export type Entitlement = {
  id: string;
  user_id: string;
  app_id: AurzoAppId | null;
  tier: Tier;
  features: Record<string, unknown>;
  seats: number;
  current_period_end: string | null;
  cancelled_at: string | null;
};

export type Notification = {
  id: string;
  user_id: string;
  app_id: AurzoAppId | null;
  title: string;
  body: string | null;
  action_url: string | null;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  category: string | null;
  read_at: string | null;
  sent_at: string;
};
