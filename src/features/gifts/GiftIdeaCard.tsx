import { useState } from 'react';
import type { GiftIdea, GiftStatus } from '@/types/gifts';
import { GIFT_STATUS_LABELS } from '@/types/gifts';
import { useGiftsStore } from '@/stores/giftsStore';
import MarkGivenModal from './MarkGivenModal';

type Props = { idea: GiftIdea; showPerson?: string };

export default function GiftIdeaCard({ idea, showPerson }: Props) {
  const edit = useGiftsStore((s) => s.editIdea);
  const remove = useGiftsStore((s) => s.removeIdea);
  const [showGiven, setShowGiven] = useState(false);

  function onStatusChange(next: GiftStatus) {
    if (next === 'given' && idea.status !== 'given') {
      setShowGiven(true);
      return;
    }
    void edit(idea.id, { status: next });
  }

  return (
    <div className="card-journal">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-serif text-lg text-charcoal-900">{idea.title}</h3>
          {showPerson && <div className="text-xs text-charcoal-500">for {showPerson}</div>}
          {idea.reason && (
            <p className="text-sm text-charcoal-700 mt-2">{idea.reason}</p>
          )}
          <div className="flex flex-wrap items-center gap-2 mt-3 text-xs">
            <span className="chip">{GIFT_STATUS_LABELS[idea.status]}</span>
            {idea.estimated_cost != null && (
              <span className="chip">${idea.estimated_cost.toFixed(0)}</span>
            )}
            {idea.url && (
              <a className="chip text-terracotta-700 hover:underline"
                href={idea.url} target="_blank" rel="noreferrer">Link ↗</a>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <select
            value={idea.status}
            onChange={(e) => onStatusChange(e.target.value as GiftStatus)}
            className="text-xs rounded border border-cream-200 bg-ivory-50 px-1 py-1"
          >
            {Object.entries(GIFT_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <button className="btn-ghost text-xs" onClick={() => void remove(idea.id)}
            aria-label="Delete">✕</button>
        </div>
      </div>
      {showGiven && (
        <MarkGivenModal idea={idea} onClose={() => setShowGiven(false)} />
      )}
    </div>
  );
}
