export type EventType =
  | 'dinner' | 'party' | 'trip' | 'reunion' | 'celebration' | 'other';

export type RSVP = 'invited' | 'confirmed' | 'declined' | 'maybe';

export type AurzoEvent = {
  id: string;
  owner_id: string;
  name: string;
  event_type: EventType | null;
  starts_at: string | null;
  ends_at: string | null;
  location: string | null;
  cover_photo_url: string | null;
  budget: number | null;
  notes: string | null;
  created_at: string;
};

export type EventInput = {
  name: string;
  event_type?: EventType | null;
  starts_at?: string | null;
  ends_at?: string | null;
  location?: string | null;
  cover_photo_url?: string | null;
  budget?: number | null;
  notes?: string | null;
};

export type EventGuest = {
  event_id: string;
  person_id: string;
  owner_id: string;
  rsvp: RSVP;
};

export type EventTask = {
  id: string;
  event_id: string;
  owner_id: string;
  title: string;
  done: boolean;
  sort_order: number;
};

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  dinner: 'Dinner', party: 'Party', trip: 'Trip',
  reunion: 'Reunion', celebration: 'Celebration', other: 'Other',
};

export const RSVP_LABELS: Record<RSVP, string> = {
  invited: 'Invited', confirmed: 'Going', declined: "Can't make it", maybe: 'Maybe',
};
