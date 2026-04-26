import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useGiftsStore } from '@/stores/giftsStore';
import FieldRow, { inputClass } from '@/features/people/form/FieldRow';
import type { GiftIdea } from '@/types/gifts';
import { toast } from '@/stores/toastStore';

type Props = { idea: GiftIdea; onClose: () => void };

export default function MarkGivenModal({ idea, onClose }: Props) {
  const { user } = useAuthStore();
  const markGiven = useGiftsStore((s) => s.markGiven);
  const editIdea = useGiftsStore((s) => s.editIdea);

  const today = new Date().toISOString().slice(0, 10);
  const [givenOn, setGivenOn] = useState(today);
  const [occasion, setOccasion] = useState('');
  const [cost, setCost] = useState(
    idea.estimated_cost != null ? String(idea.estimated_cost) : '',
  );
  const [reaction, setReaction] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    try {
      await markGiven({
        person_id: idea.person_id,
        title: idea.title,
        occasion: occasion.trim() || null,
        given_on: givenOn,
        cost: cost ? Number(cost) : null,
        reaction: reaction.trim() || null,
      }, user.id);
      await editIdea(idea.id, { status: 'given' });
      toast.success('Logged to history.');
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-charcoal-900/40 p-4"
      onClick={onClose}>
      <form onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="card-journal w-full max-w-md space-y-4">
        <header>
          <h2 className="font-serif text-2xl text-charcoal-900">Mark as given</h2>
          <p className="text-xs text-charcoal-500 mt-1">"{idea.title}"</p>
        </header>
        <div className="grid sm:grid-cols-2 gap-4">
          <FieldRow label="Date">
            <input type="date" required value={givenOn}
              max={today}
              onChange={(e) => setGivenOn(e.target.value)} className={inputClass} />
          </FieldRow>
          <FieldRow label="Cost">
            <input type="number" min="0" step="0.01" value={cost}
              onChange={(e) => setCost(e.target.value)} className={inputClass} />
          </FieldRow>
        </div>
        <FieldRow label="Occasion" hint="Birthday, just because, anniversary…">
          <input value={occasion} onChange={(e) => setOccasion(e.target.value)}
            className={inputClass} placeholder="e.g. her 30th" />
        </FieldRow>
        <FieldRow label="Their reaction" hint="Capture it while it's fresh.">
          <textarea value={reaction} rows={2}
            onChange={(e) => setReaction(e.target.value)} className={inputClass}
            placeholder="e.g. lit up, asked where I found it" />
        </FieldRow>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? 'Saving…' : 'Log it'}
          </button>
        </div>
      </form>
    </div>
  );
}
