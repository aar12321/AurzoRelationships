export type PartnerLink = {
  id: string;
  user_a: string;
  user_b: string;
  a_consented_at: string | null;
  b_consented_at: string | null;
  active: boolean;
  created_at: string;
};

export type CoupleCheckin = {
  id: string;
  link_id: string;
  author_id: string;
  connection_score: number | null;
  appreciation: string | null;
  created_at: string;
};

export type BucketItem = {
  id: string;
  link_id: string;
  title: string;
  done: boolean;
  done_at: string | null;
  created_at: string;
};
