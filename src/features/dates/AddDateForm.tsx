import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useDatesStore } from '@/stores/datesStore';
import { usePeopleStore } from '@/stores/peopleStore';
import type { DateType, ImportantDate } from '@/types/dates';
import { DATE_TYPE_LABELS } from '@/types/dates';
import FieldRow, { inputClass } from '@/features/people/form/FieldRow';

const LEAD_OPTIONS = [30, 14, 7, 3, 1, 0] as const;
const LEAD_LABEL: Record<number, string> = {
  30: '1 month', 14: '2 weeks', 7: '1 week', 3: '3 days', 1: '1 day', 0: 'Day of',
};

type Props = {
  personId?: string;
  existing?: ImportantDate;
  onDone?: () => void;
};

export default function AddDateForm({ personId, existing, onDone }: Props) {
  const isEdit = !!existing;
  const { user } = useAuthStore();
  const people = usePeopleStore((s) => s.people);
  const add = useDatesStore((s) => s.add);
  const update = useDatesStore((s) => s.update);
  const [label, setLabel] = useState(existing?.label ?? '');
  const [type, setType] = useState<DateType>(existing?.date_type ?? 'birthday');
  const [when, setWhen] = useState(existing?.event_date ?? '');
  const [pid, setPid] = useState(personId ?? existing?.person_id ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [recurring, setRecurring] = useState(existing?.recurring ?? true);
  const [leads, setLeads] = useState<number[]>(existing?.lead_times ?? [14, 7, 3, 0]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function toggleLead(n: number) {
    setLeads((prev) => prev.includes(n)
      ? prev.filter((x) => x !== n)
      : [...prev, n].sort((a, b) => b - a));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    setErr(null);
    try {
      const payload = {
        label: label.trim(),
        date_type: type,
        event_date: when,
        person_id: pid || null,
        notes: notes.trim() || null,
        recurring,
        lead_times: leads,
      };
      if (isEdit && existing) await update(existing.id, payload);
      else await add(payload, user.id);
      if (!isEdit) { setLabel(''); setWhen(''); setNotes(''); }
      onDone?.();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card-journal space-y-4">
      <FieldRow label="What's the date?">
        <input required value={label} onChange={(e) => setLabel(e.target.value)}
          className={inputClass} placeholder="e.g. Sarah's birthday" />
      </FieldRow>
      <div className="grid sm:grid-cols-2 gap-4">
        <FieldRow label="Type">
          <select value={type} onChange={(e) => setType(e.target.value as DateType)}
            className={inputClass}>
            {Object.entries(DATE_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </FieldRow>
        <FieldRow label="When">
          <input type="date" required value={when}
            onChange={(e) => setWhen(e.target.value)} className={inputClass} />
        </FieldRow>
      </div>
      {!personId && (
        <FieldRow label="For whom (optional)">
          <select value={pid} onChange={(e) => setPid(e.target.value)} className={inputClass}>
            <option value="">— no one in particular —</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>{p.full_name}</option>
            ))}
          </select>
        </FieldRow>
      )}
      <FieldRow label="Notes (optional)">
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
          rows={2} className={inputClass}
          placeholder="Anything to remember — gift ideas, traditions…" />
      </FieldRow>
      <div className="flex items-center gap-2">
        <input id="rec" type="checkbox" checked={recurring}
          onChange={(e) => setRecurring(e.target.checked)} />
        <label htmlFor="rec" className="text-sm text-charcoal-700 dark:text-cream-100">
          Recurring (annual)
        </label>
      </div>
      <FieldRow label="Remind me">
        <div className="flex flex-wrap gap-2">
          {LEAD_OPTIONS.map((n) => {
            const on = leads.includes(n);
            return (
              <button type="button" key={n} onClick={() => toggleLead(n)}
                className={[
                  'rounded-full px-3 py-1 text-xs border transition-colors',
                  on
                    ? 'bg-terracotta-500 border-terracotta-500 text-ivory-50'
                    : 'border-cream-200 text-charcoal-700 hover:bg-cream-100',
                ].join(' ')}>
                {LEAD_LABEL[n]}
              </button>
            );
          })}
        </div>
      </FieldRow>
      {err && <p className="text-sm text-terracotta-700">{err}</p>}
      <div className="flex justify-end gap-2">
        {onDone && (
          <button type="button" onClick={onDone} className="btn-ghost">Cancel</button>
        )}
        <button type="submit" className="btn-primary" disabled={busy || !label || !when}>
          {busy ? 'Saving…' : isEdit ? 'Save changes' : 'Save'}
        </button>
      </div>
    </form>
  );
}
