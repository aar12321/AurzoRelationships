export type DateType =
  | 'birthday' | 'anniversary' | 'work_anniversary' | 'sobriety' | 'surgery'
  | 'graduation' | 'due_date' | 'new_job' | 'moving' | 'exam'
  | 'holiday' | 'custom';

export type ImportantDate = {
  id: string;
  owner_id: string;
  person_id: string | null;
  label: string;
  date_type: DateType;
  event_date: string;
  recurring: boolean;
  lead_times: number[];
  notes: string | null;
  created_at: string;
};

export type ImportantDateInput = {
  person_id?: string | null;
  label: string;
  date_type: DateType;
  event_date: string;
  recurring?: boolean;
  lead_times?: number[];
  notes?: string | null;
};

export const DATE_TYPE_LABELS: Record<DateType, string> = {
  birthday: 'Birthday',
  anniversary: 'Anniversary',
  work_anniversary: 'Work anniversary',
  sobriety: 'Sobriety date',
  surgery: 'Surgery',
  graduation: 'Graduation',
  due_date: 'Due date',
  new_job: 'New job',
  moving: 'Moving',
  exam: 'Exam',
  holiday: 'Holiday',
  custom: 'Custom',
};

export const DATE_TYPE_EMOJI: Record<DateType, string> = {
  birthday: '🎂', anniversary: '💛', work_anniversary: '💼',
  sobriety: '🌱', surgery: '🩹', graduation: '🎓',
  due_date: '👶', new_job: '🗝️', moving: '📦',
  exam: '📖', holiday: '🎉', custom: '✨',
};

export function nextOccurrence(d: ImportantDate, from = new Date()): Date {
  const base = new Date(d.event_date + 'T00:00:00');
  if (!d.recurring) return base;
  const year = from.getFullYear();
  let next = new Date(base);
  next.setFullYear(year);
  if (next < startOfDay(from)) next.setFullYear(year + 1);
  return next;
}

export function daysUntil(d: ImportantDate, from = new Date()): number {
  const next = nextOccurrence(d, from);
  const ms = next.getTime() - startOfDay(from).getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

export function turningAge(d: ImportantDate, from = new Date()): number | null {
  if (d.date_type !== 'birthday' || !d.recurring) return null;
  const birth = new Date(d.event_date + 'T00:00:00');
  return nextOccurrence(d, from).getFullYear() - birth.getFullYear();
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
