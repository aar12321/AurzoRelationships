import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePeopleStore } from '@/stores/peopleStore';
import { toast } from '@/stores/toastStore';
import ConfirmModal from '@/components/ConfirmModal';
import type { Person } from '@/types/people';

export default function DangerZone({ person }: { person: Person }) {
  const nav = useNavigate();
  const { remove } = usePeopleStore();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  return (
    <>
      <div className="card-journal mt-6 border-terracotta-200 dark:border-terracotta-700/40">
        <h2 className="font-serif text-xl mb-2 text-terracotta-700 dark:text-terracotta-300">
          Danger zone
        </h2>
        <p className="text-sm text-charcoal-500 dark:text-charcoal-300 mb-4">
          Deleting {person.full_name} also removes their memories, gift ideas,
          messages, important dates, and interaction history. This can't be undone.
        </p>
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          className="rounded-journal px-4 py-2 text-sm border border-terracotta-300
                     dark:border-terracotta-700/50 text-terracotta-700
                     dark:text-terracotta-300 hover:bg-terracotta-50
                     dark:hover:bg-terracotta-900/30 transition-colors"
        >
          Delete {person.full_name}
        </button>
      </div>

      <ConfirmModal
        open={confirmDelete}
        title={`Delete ${person.full_name}?`}
        description={
          <>
            This removes them and everything connected to them — memories,
            gifts, messages, dates, interactions. It can't be undone.
          </>
        }
        confirmLabel={`Yes, delete ${person.full_name.split(' ')[0]}`}
        cancelLabel="Keep"
        tone="danger"
        busy={deleting}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={async () => {
          setDeleting(true);
          try {
            await remove(person.id);
            toast.success(`${person.full_name} removed.`);
            nav('/relationships/people');
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Could not delete.');
            setDeleting(false);
          }
        }}
      />
    </>
  );
}
