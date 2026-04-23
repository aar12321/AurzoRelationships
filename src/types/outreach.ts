export type Occasion =
  | 'birthday' | 'check_in_hard_time' | 'congratulations' | 'long_time'
  | 'thank_you' | 'thinking_of_you' | 'holiday' | 'apology' | 'sympathy';

export type Tone = 'warm' | 'funny' | 'heartfelt' | 'brief' | 'formal';

export type Channel = 'text' | 'imessage' | 'whatsapp' | 'email' | 'letter' | 'voice_note';

export type OutreachMessage = {
  id: string;
  owner_id: string;
  person_id: string;
  occasion: Occasion;
  tone: Tone;
  channel: Channel;
  body: string;
  sent_at: string | null;
  follow_up_at: string | null;
  created_at: string;
};

export type OutreachInput = {
  person_id: string;
  occasion: Occasion;
  tone: Tone;
  channel: Channel;
  body: string;
  sent_at?: string | null;
  follow_up_at?: string | null;
};

export const OCCASION_LABELS: Record<Occasion, string> = {
  birthday: 'Birthday',
  check_in_hard_time: 'Checking in',
  congratulations: 'Congratulations',
  long_time: 'Long time no talk',
  thank_you: 'Thank you',
  thinking_of_you: 'Thinking of you',
  holiday: 'Holiday',
  apology: 'Apology',
  sympathy: 'Sympathy',
};

export const TONE_LABELS: Record<Tone, string> = {
  warm: 'Warm', funny: 'Funny', heartfelt: 'Heartfelt',
  brief: 'Brief', formal: 'Formal',
};

export const CHANNEL_LABELS: Record<Channel, string> = {
  text: 'Text', imessage: 'iMessage', whatsapp: 'WhatsApp',
  email: 'Email', letter: 'Handwritten', voice_note: 'Voice note',
};
