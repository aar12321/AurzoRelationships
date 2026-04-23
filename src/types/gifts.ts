export type GiftSource = 'manual' | 'ai' | 'link' | 'photo';
export type GiftStatus = 'idea' | 'planned' | 'given' | 'skipped';

export type GiftIdea = {
  id: string;
  owner_id: string;
  person_id: string;
  title: string;
  reason: string | null;
  url: string | null;
  estimated_cost: number | null;
  source: GiftSource;
  status: GiftStatus;
  created_at: string;
};

export type GiftIdeaInput = {
  person_id: string;
  title: string;
  reason?: string | null;
  url?: string | null;
  estimated_cost?: number | null;
  source?: GiftSource;
  status?: GiftStatus;
};

export type GiftGiven = {
  id: string;
  owner_id: string;
  person_id: string;
  title: string;
  occasion: string | null;
  given_on: string;
  cost: number | null;
  reaction: string | null;
  created_at: string;
};

export type GiftGivenInput = {
  person_id: string;
  title: string;
  occasion?: string | null;
  given_on: string;
  cost?: number | null;
  reaction?: string | null;
};

export const GIFT_STATUS_LABELS: Record<GiftStatus, string> = {
  idea: 'Idea', planned: 'Planned', given: 'Given', skipped: 'Skipped',
};
