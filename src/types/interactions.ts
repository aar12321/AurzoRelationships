export type InteractionKind =
  | 'call' | 'text' | 'in_person' | 'video' | 'letter' | 'event';

export type InteractionQuality = 'quick' | 'meaningful' | 'deep';

export type Interaction = {
  id: string;
  owner_id: string;
  person_id: string;
  kind: InteractionKind;
  quality: InteractionQuality | null;
  duration_minutes: number | null;
  notes: string | null;
  occurred_at: string;
  created_at: string;
};

export type InteractionInput = {
  person_id: string;
  kind: InteractionKind;
  quality?: InteractionQuality | null;
  duration_minutes?: number | null;
  notes?: string | null;
  occurred_at?: string;
};

export const KIND_LABELS: Record<InteractionKind, string> = {
  call: 'Call',
  text: 'Text',
  in_person: 'In person',
  video: 'Video',
  letter: 'Letter',
  event: 'Event',
};

export const KIND_EMOJI: Record<InteractionKind, string> = {
  call: '📞', text: '💬', in_person: '🤝', video: '🎥', letter: '✉️', event: '🎈',
};

export const QUALITY_LABELS: Record<InteractionQuality, string> = {
  quick: 'Quick check-in',
  meaningful: 'Meaningful',
  deep: 'Deep catch-up',
};

export const QUALITY_WEIGHT: Record<InteractionQuality, number> = {
  quick: 1, meaningful: 2, deep: 4,
};
