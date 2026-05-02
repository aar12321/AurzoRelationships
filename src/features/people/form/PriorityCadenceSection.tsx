import type { PriorityTier, SocialCapacity } from '@/types/people';
import { PRIORITY_TIER_LABELS, SOCIAL_CAPACITY_LABELS } from '@/types/people';
import FieldRow, { inputClass } from './FieldRow';

export type PriorityCadenceForm = {
  priority_tier: PriorityTier | '';
  cadence_days: string; // empty string when unset; numeric input
  do_not_nudge_until: string; // YYYY-MM-DD or empty
  social_capacity: SocialCapacity | '';
};

type Props = {
  value: PriorityCadenceForm;
  onChange: <K extends keyof PriorityCadenceForm>(k: K, v: PriorityCadenceForm[K]) => void;
};

const TIERS: PriorityTier[] = ['inner', 'close', 'casual'];

export default function PriorityCadenceSection({ value, onChange }: Props) {
  return (
    <div className="space-y-4 pt-2 border-t border-cream-200 dark:border-charcoal-700">
      <p className="text-xs uppercase tracking-wider text-charcoal-500 dark:text-charcoal-300">
        Priority & rhythm
      </p>

      <FieldRow label="Tier">
        <div className="flex flex-wrap gap-2">
          <TierChip
            active={value.priority_tier === ''}
            onClick={() => onChange('priority_tier', '')}
            label="Unsorted"
          />
          {TIERS.map((t) => (
            <TierChip key={t}
              active={value.priority_tier === t}
              onClick={() => onChange('priority_tier', t)}
              label={PRIORITY_TIER_LABELS[t]}
            />
          ))}
        </div>
      </FieldRow>

      <div className="grid sm:grid-cols-2 gap-4">
        <FieldRow label="Catch up every (days)">
          <input
            type="number" min={1} max={365} placeholder="e.g. 14"
            value={value.cadence_days}
            onChange={(e) => onChange('cadence_days', e.target.value)}
            className={inputClass}
          />
        </FieldRow>
        <FieldRow label="Pause nudges until">
          <input
            type="date"
            value={value.do_not_nudge_until}
            onChange={(e) => onChange('do_not_nudge_until', e.target.value)}
            className={inputClass}
          />
        </FieldRow>
      </div>

      <FieldRow label="Social capacity for them">
        <select
          value={value.social_capacity}
          onChange={(e) => onChange('social_capacity', e.target.value as PriorityCadenceForm['social_capacity'])}
          className={inputClass}
        >
          <option value="">Not set</option>
          {(Object.entries(SOCIAL_CAPACITY_LABELS) as [SocialCapacity, string][]).map(([k, label]) => (
            <option key={k} value={k}>{label}</option>
          ))}
        </select>
      </FieldRow>
    </div>
  );
}

function TierChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
        active
          ? 'bg-gold-500 text-ivory-50 border-gold-500'
          : 'bg-cream-50 dark:bg-charcoal-800 border-cream-200 dark:border-charcoal-700 text-charcoal-700 dark:text-charcoal-200 hover:bg-cream-100 dark:hover:bg-charcoal-700'
      }`}
    >
      {label}
    </button>
  );
}
