import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useDatesStore } from '@/stores/datesStore';
import { usePeopleStore } from '@/stores/peopleStore';
import type { DateType } from '@/types/dates';
import { DATE_TYPE_LABELS } from '@/types/dates';
import FieldRow, { inputClass } from '@/features/people/form/FieldRow';

type Props = { personId?: string; onDone?: () => void };

export default function AddDateForm({ personId, onDone }: Props) {
  const { user } = useAuthStore();
  const people = usePeopleStore((s) => s.people);
  const add = useDatesStore((s) => s.add);
  const [label, setLabel] = useState('');
  const [type, setType] = useState<DateType>('birthday');
  const [when, setWhen] = useState('');
  const [pid, setPid] = useState(personId ?? '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    setErr(null);
    try {
      await add(
        {
          label: label.trim(),
          date_type: type,
          event_date: when,
          person_id: pid || null,
        },
        user.id,
      );
      setLabel(''); setWhen('');
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
      {err && <p className="text-sm text-terracotta-700">{err}</p>}
      <div className="flex justify-end gap-2">
        {onDone && (
          <button type="button" onClick={onDone} className="btn-ghost">Cancel</button>
        )}
        <button type="submit" className="btn-primary" disabled={busy || !label || !when}>
          {busy ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  );
}
