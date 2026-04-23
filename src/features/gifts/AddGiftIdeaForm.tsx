import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useGiftsStore } from '@/stores/giftsStore';
import { usePeopleStore } from '@/stores/peopleStore';
import FieldRow, { inputClass } from '@/features/people/form/FieldRow';

type Props = { personId?: string; onDone?: () => void };

export default function AddGiftIdeaForm({ personId, onDone }: Props) {
  const { user } = useAuthStore();
  const addIdea = useGiftsStore((s) => s.addIdea);
  const people = usePeopleStore((s) => s.people);

  const [pid, setPid] = useState(personId ?? '');
  const [title, setTitle] = useState('');
  const [reason, setReason] = useState('');
  const [url, setUrl] = useState('');
  const [cost, setCost] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true); setErr(null);
    try {
      await addIdea({
        person_id: pid,
        title: title.trim(),
        reason: reason.trim() || null,
        url: url.trim() || null,
        estimated_cost: cost ? Number(cost) : null,
      }, user.id);
      setTitle(''); setReason(''); setUrl(''); setCost('');
      onDone?.();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Save failed');
    } finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="card-journal space-y-4">
      {!personId && (
        <FieldRow label="For whom">
          <select required value={pid} onChange={(e) => setPid(e.target.value)}
            className={inputClass}>
            <option value="">Pick someone</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>{p.full_name}</option>
            ))}
          </select>
        </FieldRow>
      )}
      <FieldRow label="Gift idea">
        <input required value={title} onChange={(e) => setTitle(e.target.value)}
          className={inputClass} placeholder="e.g. Pour-over coffee kit" />
      </FieldRow>
      <FieldRow label="Why it fits" hint="A line so future you remembers.">
        <input value={reason} onChange={(e) => setReason(e.target.value)}
          className={inputClass} placeholder="e.g. she mentioned loving good coffee" />
      </FieldRow>
      <div className="grid sm:grid-cols-2 gap-4">
        <FieldRow label="Link (optional)">
          <input value={url} onChange={(e) => setUrl(e.target.value)}
            className={inputClass} placeholder="https://…" />
        </FieldRow>
        <FieldRow label="Estimated cost">
          <input type="number" min="0" step="0.01" value={cost}
            onChange={(e) => setCost(e.target.value)} className={inputClass} />
        </FieldRow>
      </div>
      {err && <p className="text-sm text-terracotta-700">{err}</p>}
      <div className="flex justify-end gap-2">
        {onDone && <button type="button" className="btn-ghost" onClick={onDone}>Cancel</button>}
        <button type="submit" className="btn-primary" disabled={busy || !pid || !title}>
          {busy ? 'Saving…' : 'Save idea'}
        </button>
      </div>
    </form>
  );
}
