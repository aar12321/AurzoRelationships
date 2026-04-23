export type AdvisorRole = 'user' | 'assistant' | 'system';

export type AdvisorThread = {
  id: string;
  owner_id: string;
  title: string | null;
  created_at: string;
};

export type AdvisorMessage = {
  id: string;
  thread_id: string;
  owner_id: string;
  role: AdvisorRole;
  content: string;
  created_at: string;
};

export const SUGGESTED_PROMPTS: string[] = [
  "Who should I reach out to?",
  "Help me plan something special",
  "I haven't talked to someone in a while — how do I reconnect?",
  "I need to write a hard message",
  "Give me a conversation starter",
];
