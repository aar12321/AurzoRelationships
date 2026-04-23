import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useInteractionsStore } from '@/stores/interactionsStore';
import { usePeopleStore } from '@/stores/peopleStore';
import type { InteractionKind, InteractionQuality } from '@/types/interactions';
import { KIND_EMOJI, KIND_LABELS, QUALITY_LABELS } from '@/types/interactions';
import FieldRow, { inputClass } from '@/features/people/form/FieldRow';

type Props = { personId?: string; onDone?: () => void };

export default function LogInteractionForm({ personId, onDone }: Props) {
  const { user } = useAuthStore();
  const log = useInteractionsStore((s) => s.log);
  const people = usePeopleStore((s) => s.people);

  const [pid, setPid] = useState(personId ?? '');
  const [kind, setKind] = useState<InteractionKind>('text');
  const [quality, setQuality] = useState<InteractionQuality>('quick');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    setErr(null);
    try {
      await log({ person_id: pid, kind, quality, notes: notes || null }, user.id);
      setNotes('');
      onDone?.();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card-journal space-y-4">
      {!personId && (
        <FieldRow label="Who?">
          <select required value={pid} onChange={(e) => setPid(e.target.value)}
            className={inputClass}>
            <option value="">Pick someone</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>{p.full_name}</option>
            ))}
          </select>
        </FieldRow>
      )}

      <FieldRow label="How">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(KIND_LABELS) as InteractionKind[]).map((k) => (
            <button key={k} type="button" onClick={() => setKind(k)}
              className={[
                'rounded-full border px-3 py-1.5 text-sm transition-colors',
                kind === k
                  ? 'bg-terracotta-600 border-terracotta-600 text-ivory-50'
                  : 'bg-ivory-50 border-cream-200 text-charcoal-700 hover:bg-cream-100',
              ].join(' ')}>
              <span className="mr-1.5">{KIND_EMOJI[k]}</span>{KIND_LABELS[k]}
            </button>
          ))}
        </div>
      </FieldRow>

      <FieldRow label="Quality">
        <div className="flex gap-2">
          {(Object.keys(QUALITY_LABELS) as InteractionQuality[]).map((q) => (
            <button key={q} type="button" onClick={() => setQuality(q)}
              className={[
                'flex-1 rounded-journal border px-3 py-2 text-sm transition-colors',
                quality === q
                  ? 'bg-gold-300 border-gold-500 text-charcoal-900'
                  : 'bg-ivory-50 border-cream-200 text-charcoal-700 hover:bg-cream-100',
              ].join(' ')}>
              {QUALITY_LABELS[q]}
            </button>
          ))}
        </div>
      </FieldRow>

      <FieldRow label="Notes" hint="Anything worth remembering from this?">
        <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)}
          className={inputClass} />
      </FieldRow>

      {err && <p className="text-sm text-terracotta-700">{err}</p>}
      <div className="flex justify-end gap-2">
        {onDone && <button type="button" className="btn-ghost" onClick={onDone}>Cancel</button>}
        <button type="submit" className="btn-primary" disabled={busy || !pid}>
          {busy ? 'Saving…' : 'Log it'}
        </button>
      </div>
    </form>
  );
}
