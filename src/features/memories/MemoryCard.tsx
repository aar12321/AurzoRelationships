import type { Memory } from '@/types/memories';
import { MEMORY_TYPE_EMOJI, MEMORY_TYPE_LABELS } from '@/types/memories';

type Props = { memory: Memory; onDelete?: () => void };

export default function MemoryCard({ memory, onDelete }: Props) {
  return (
    <article className="card-journal">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs text-charcoal-500">
            {memory.memory_type && (
              <span>
                {MEMORY_TYPE_EMOJI[memory.memory_type]}{' '}
                {MEMORY_TYPE_LABELS[memory.memory_type]}
              </span>
            )}
            {memory.occurred_on && (
              <span>· {new Date(memory.occurred_on + 'T00:00:00').toLocaleDateString()}</span>
            )}
            {memory.location && <span>· {memory.location}</span>}
          </div>
          {memory.title && (
            <h3 className="font-serif text-xl text-charcoal-900 mt-1">{memory.title}</h3>
          )}
          {memory.note && (
            <p className="text-charcoal-700 mt-2 whitespace-pre-wrap">{memory.note}</p>
          )}
        </div>
        {onDelete && (
          <button className="btn-ghost text-xs" onClick={onDelete} aria-label="Delete">✕</button>
        )}
      </div>
      {memory.photo_urls.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mt-3">
          {memory.photo_urls.slice(0, 6).map((url) => (
            <img key={url} src={url} alt="" className="aspect-square object-cover rounded-journal" />
          ))}
        </div>
      )}
    </article>
  );
}
