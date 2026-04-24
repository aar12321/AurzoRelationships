// Edit a person. Mirrors AddPersonPage's form shape so the fields feel
// identical; the only real difference is how we initialise + how the
// submit maps onto the peopleStore (update, not add).
//
// Birthday changes flow through peopleStore.update → syncPersonBirthday
// automatically, so editing a birthday keeps the important_date row
// in sync without any extra wiring here.

import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { usePeopleStore } from '@/stores/peopleStore';
import { toast } from '@/stores/toastStore';
import ConfirmModal from '@/components/ConfirmModal';
import type {
  CommunicationPref,
  Person,
  PersonInput,
  RelationshipGoal,
  RelationshipType,
} from '@/types/people';
import {
  COMMUNICATION_PREF_LABELS,
  RELATIONSHIP_GOAL_LABELS,
  RELATIONSHIP_TYPE_LABELS,
} from '@/types/people';
import FieldRow, { inputClass } from './form/FieldRow';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

type Form = {
  full_name: string;
  relationship_type: RelationshipType | '';
  birthday: string;
  location: string;
  how_we_met: string;
  notes: string;
  relationship_goal: RelationshipGoal | '';
  communication_pref: CommunicationPref | '';
};

function fromPerson(p: Person): Form {
  return {
    full_name: p.full_name,
    relationship_type: p.relationship_type ?? '',
    birthday: p.birthday ?? '',
    location: p.location ?? '',
    how_we_met: p.how_we_met ?? '',
    notes: p.notes ?? '',
    relationship_goal: p.relationship_goal ?? '',
    communication_pref: p.communication_pref ?? '',
  };
}

export default function EditPersonPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuthStore();
  const { people, loadAll, update, remove } = usePeopleStore();
  const person = people.find((p) => p.id === id);
  useDocumentTitle(person ? `Edit ${person.full_name}` : 'Edit person');

  const [form, setForm] = useState<Form | null>(person ? fromPerson(person) : null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (people.length === 0) void loadAll();
  }, [loadAll, people.length]);

  useEffect(() => {
    if (person && form === null) setForm(fromPerson(person));
  }, [person, form]);

  if (!person) {
    return (
      <section className="animate-bloom">
        <div className="card-journal text-center py-12">
          <p className="text-charcoal-700 dark:text-charcoal-200">We couldn't find that person.</p>
          <Link to="/relationships/people" className="btn-primary mt-4 inline-flex">
            Back to People
          </Link>
        </div>
      </section>
    );
  }
  if (!form) return null;

  function set<K extends keyof Form>(k: K, v: Form[K]) {
    setForm((f) => (f ? { ...f, [k]: v } : f));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !form || !person) return;
    setBusy(true); setError(null);
    try {
      const patch: Partial<PersonInput> = {
        full_name: form.full_name.trim(),
        relationship_type: form.relationship_type || null,
        birthday: form.birthday || null,
        location: form.location.trim() || null,
        how_we_met: form.how_we_met.trim() || null,
        notes: form.notes.trim() || null,
        relationship_goal: form.relationship_goal || null,
        communication_pref: form.communication_pref || null,
      };
      await update(person.id, patch);
      toast.success('Saved.');
      nav(`/relationships/people/${person.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save.');
      toast.error('Could not save. Try again.');
      setBusy(false);
    }
  }

  return (
    <section className="animate-bloom max-w-2xl">
      <Link to={`/relationships/people/${person.id}`} className="text-xs text-charcoal-500 dark:text-charcoal-300">
        ← {person.full_name}
      </Link>
      <header className="mb-6 mt-1">
        <h1 className="text-4xl">Edit {person.full_name}</h1>
        <p className="text-charcoal-500 dark:text-charcoal-300 mt-1">
          Update anything — only name is required.
        </p>
      </header>

      <form onSubmit={onSubmit} className="card-journal space-y-5">
        <FieldRow label="Their name">
          <input required value={form.full_name}
            onChange={(e) => set('full_name', e.target.value)}
            className={inputClass} />
        </FieldRow>

        <FieldRow label="Relationship">
          <select value={form.relationship_type}
            onChange={(e) => set('relationship_type', e.target.value as Form['relationship_type'])}
            className={inputClass}>
            <option value="">None</option>
            {Object.entries(RELATIONSHIP_TYPE_LABELS).map(([k, label]) => (
              <option key={k} value={k}>{label}</option>
            ))}
          </select>
        </FieldRow>

        <div className="grid sm:grid-cols-2 gap-4">
          <FieldRow label="Birthday">
            <input type="date" value={form.birthday}
              onChange={(e) => set('birthday', e.target.value)}
              className={inputClass} />
          </FieldRow>
          <FieldRow label="Where they live">
            <input value={form.location}
              onChange={(e) => set('location', e.target.value)}
              className={inputClass} />
          </FieldRow>
        </div>

        <FieldRow label="How you met">
          <input value={form.how_we_met}
            onChange={(e) => set('how_we_met', e.target.value)}
            className={inputClass} />
        </FieldRow>

        <div className="grid sm:grid-cols-2 gap-4">
          <FieldRow label="Your goal">
            <select value={form.relationship_goal}
              onChange={(e) => set('relationship_goal', e.target.value as Form['relationship_goal'])}
              className={inputClass}>
              <option value="">No goal yet</option>
              {Object.entries(RELATIONSHIP_GOAL_LABELS).map(([k, label]) => (
                <option key={k} value={k}>{label}</option>
              ))}
            </select>
          </FieldRow>
          <FieldRow label="They prefer">
            <select value={form.communication_pref}
              onChange={(e) => set('communication_pref', e.target.value as Form['communication_pref'])}
              className={inputClass}>
              <option value="">Not sure yet</option>
              {Object.entries(COMMUNICATION_PREF_LABELS).map(([k, label]) => (
                <option key={k} value={k}>{label}</option>
              ))}
            </select>
          </FieldRow>
        </div>

        <FieldRow label="Notes">
          <textarea rows={4} value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            className={inputClass} />
        </FieldRow>

        {error && <p className="text-sm text-terracotta-700">{error}</p>}

        <div className="flex items-center justify-end gap-3">
          <button type="button" className="btn-ghost"
            onClick={() => nav(`/relationships/people/${person.id}`)}>
            Cancel
          </button>
          <button type="submit" className="btn-primary"
            disabled={busy || !form.full_name.trim()}>
            {busy ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>

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
    </section>
  );
}
