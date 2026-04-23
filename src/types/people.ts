export type RelationshipType =
  | 'close_friend'
  | 'family'
  | 'partner'
  | 'mentor'
  | 'colleague'
  | 'acquaintance'
  | 'reconnecting';

export type RelationshipGoal = 'maintain' | 'deepen' | 'reconnect' | 'let_drift';

export type CommunicationPref =
  | 'call'
  | 'text'
  | 'in_person'
  | 'video'
  | 'letter'
  | 'no_preference';

export type CustomField = { label: string; value: string };

export type LifeContext = {
  job?: string;
  relationship_status?: string;
  kids?: string;
  major_events?: string;
};

export type Person = {
  id: string;
  owner_id: string;
  full_name: string;
  photo_url: string | null;
  relationship_type: RelationshipType | null;
  relationship_goal: RelationshipGoal | null;
  how_we_met: string | null;
  met_on: string | null;
  location: string | null;
  birthday: string | null;
  life_context: LifeContext;
  communication_pref: CommunicationPref | null;
  notes: string | null;
  custom_fields: CustomField[];
  fading_threshold_days: number | null;
  last_contacted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PersonInput = Partial<
  Omit<Person, 'id' | 'owner_id' | 'created_at' | 'updated_at'>
> & {
  full_name: string;
};

export type PersonGroup = {
  id: string;
  owner_id: string;
  name: string;
  color: string | null;
  created_at: string;
};

export const RELATIONSHIP_TYPE_LABELS: Record<RelationshipType, string> = {
  close_friend: 'Close friend',
  family: 'Family',
  partner: 'Partner',
  mentor: 'Mentor',
  colleague: 'Colleague',
  acquaintance: 'Acquaintance',
  reconnecting: 'Reconnecting',
};

export const RELATIONSHIP_GOAL_LABELS: Record<RelationshipGoal, string> = {
  maintain: 'Maintain',
  deepen: 'Deepen',
  reconnect: 'Reconnect',
  let_drift: 'Let drift',
};

export const COMMUNICATION_PREF_LABELS: Record<CommunicationPref, string> = {
  call: 'Calls',
  text: 'Texts',
  in_person: 'In person',
  video: 'Video',
  letter: 'Letters',
  no_preference: 'No preference',
};

export type Strength = 'thriving' | 'active' | 'fading' | 'dormant' | 'unknown';

export const STRENGTH_LABELS: Record<Strength, string> = {
  thriving: 'Thriving',
  active: 'Active',
  fading: 'Fading',
  dormant: 'Dormant',
  unknown: 'New',
};
