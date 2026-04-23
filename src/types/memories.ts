export type MemoryType =
  | 'adventure' | 'milestone' | 'everyday' | 'tradition' | 'first_time' | 'last_time';

export type Memory = {
  id: string;
  owner_id: string;
  title: string | null;
  note: string | null;
  memory_type: MemoryType | null;
  mood: string | null;
  location: string | null;
  occurred_on: string | null;
  photo_urls: string[];
  created_at: string;
};

export type MemoryInput = {
  title?: string | null;
  note?: string | null;
  memory_type?: MemoryType | null;
  mood?: string | null;
  location?: string | null;
  occurred_on?: string | null;
  photo_urls?: string[];
  person_ids?: string[];
};

export const MEMORY_TYPE_LABELS: Record<MemoryType, string> = {
  adventure: 'Adventure', milestone: 'Milestone', everyday: 'Everyday',
  tradition: 'Tradition', first_time: 'First time', last_time: 'Last time',
};

export const MEMORY_TYPE_EMOJI: Record<MemoryType, string> = {
  adventure: '🏔️', milestone: '🎖️', everyday: '☕',
  tradition: '🕯️', first_time: '🌟', last_time: '🍂',
};
