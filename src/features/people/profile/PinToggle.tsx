// Pin/unpin a person to the Pinned strip. Writes to aurzo_core.user_selections
// via the Phase 6 hook; optimistic UI with auto-rollback on failure. Shows
// as an icon-only button in the profile header so it doesn't crowd the
// primary actions row.

import { useSelection } from '@/hooks/useSelections';
import { toast } from '@/stores/toastStore';
import type { Person } from '@/types/people';

export default function PinToggle({ person }: { person: Person }) {
  const { saved, loading, toggle } = useSelection({
    collection: 'pinned_people',
    itemId: person.id,
    itemType: 'person',
    snapshot: {
      full_name: person.full_name,
      photo_url: person.photo_url,
      relationship_type: person.relationship_type,
    },
  });

  async function onClick() {
    const wasSaved = saved;
    try {
      await toggle();
      toast.success(wasSaved
        ? `${person.full_name.split(' ')[0]} unpinned.`
        : `${person.full_name.split(' ')[0]} pinned to the top.`);
    } catch {
      toast.error('Could not update. Try again.');
    }
  }

  return (
    <button
      onClick={() => void onClick()}
      disabled={loading}
      aria-pressed={saved}
      aria-label={saved ? 'Unpin this person' : 'Pin this person to the top'}
      title={saved ? 'Unpin' : 'Pin to top'}
      className={[
        'shrink-0 w-9 h-9 rounded-full flex items-center justify-center',
        'transition-colors disabled:opacity-40',
        saved
          ? 'bg-terracotta-500 text-ivory-50 hover:bg-terracotta-400'
          : 'bg-cream-100 text-charcoal-500 hover:bg-cream-200 dark:bg-charcoal-800 dark:text-charcoal-300 dark:hover:bg-charcoal-700',
      ].join(' ')}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'}
           stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
           aria-hidden>
        <path d="M12 17v5"/>
        <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/>
      </svg>
    </button>
  );
}
