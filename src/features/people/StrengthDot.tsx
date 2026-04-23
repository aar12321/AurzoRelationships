import type { Strength } from '@/types/people';
import { STRENGTH_LABELS } from '@/types/people';

const COLOR: Record<Strength, string> = {
  thriving: 'bg-terracotta-500 shadow-[0_0_12px_rgba(198,122,91,0.55)]',
  active: 'bg-gold-500 shadow-[0_0_8px_rgba(201,161,91,0.45)]',
  fading: 'bg-cream-200',
  dormant: 'bg-charcoal-500/30',
  unknown: 'bg-cream-200',
};

type Props = { strength: Strength; withLabel?: boolean };

export default function StrengthDot({ strength, withLabel }: Props) {
  return (
    <span className="inline-flex items-center gap-2" title={STRENGTH_LABELS[strength]}>
      <span className={['h-2.5 w-2.5 rounded-full', COLOR[strength]].join(' ')} />
      {withLabel && (
        <span className="text-xs text-charcoal-500">{STRENGTH_LABELS[strength]}</span>
      )}
    </span>
  );
}
