import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { usePeopleStore } from '@/stores/peopleStore';
import type {
  CommunicationPref,
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

const EMPTY: Form = {
  full_name: '',
  relationship_type: '',
  birthday: '',
  location: '',
  how_we_met: '',
  notes: '',
  relationship_goal: '',
  communication_pref: '',
};

export default function AddPersonPage() {
  const nav = useNavigate();
  const { user } = useAuthStore();
  const { add } = usePeopleStore();
  const [form, setForm] = useState<Form>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof Form>(k: K, v: Form[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    setError(null);
    try {
      const payload: PersonInput = {
        full_name: form.full_name.trim(),
        relationship_type: form.relationship_type || null,
        birthday: form.birthday || null,
        location: form.location.trim() || null,
        how_we_met: form.how_we_met.trim() || null,
        notes: form.notes.trim() || null,
        relationship_goal: form.relationship_goal || null,
        communication_pref: form.communication_pref || null,
      };
      const person = await add(payload, user.id);
      nav(`/relationships/people/${person.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save.');
      setBusy(false);
    }
  }

  return (
    <section className="animate-bloom max-w-2xl">
      <header className="mb-6">
        <h1 className="text-4xl">Add someone</h1>
        <p className="text-charcoal-500 mt-1">
          Only a name is required — everything else can come later.
        </p>
      </header>

      <form onSubmit={onSubmit} className="card-journal space-y-5">
        <FieldRow label="Their name">
          <input
            required
            autoFocus
            value={form.full_name}
            onChange={(e) => set('full_name', e.target.value)}
            className={inputClass}
            placeholder="e.g. Sarah Chen"
          />
        </FieldRow>

        <FieldRow label="Relationship">
          <select
            value={form.relationship_type}
            onChange={(e) => set('relationship_type', e.target.value as Form['relationship_type'])}
            className={inputClass}
          >
            <option value="">Choose one (optional)</option>
            {Object.entries(RELATIONSHIP_TYPE_LABELS).map(([k, label]) => (
              <option key={k} value={k}>{label}</option>
            ))}
          </select>
        </FieldRow>

        <div className="grid sm:grid-cols-2 gap-4">
          <FieldRow label="Birthday">
            <input
              type="date"
              value={form.birthday}
              onChange={(e) => set('birthday', e.target.value)}
              className={inputClass}
            />
          </FieldRow>
          <FieldRow label="Where they live">
            <input
              value={form.location}
              onChange={(e) => set('location', e.target.value)}
              className={inputClass}
              placeholder="City, state, or country"
            />
          </FieldRow>
        </div>

        <FieldRow label="How you met" hint="A line you'd want to remember.">
          <input
            value={form.how_we_met}
            onChange={(e) => set('how_we_met', e.target.value)}
            className={inputClass}
            placeholder="e.g. freshman year roommates"
          />
        </FieldRow>

        <div className="grid sm:grid-cols-2 gap-4">
          <FieldRow label="Your goal with them">
            <select
              value={form.relationship_goal}
              onChange={(e) => set('relationship_goal', e.target.value as Form['relationship_goal'])}
              className={inputClass}
            >
              <option value="">No goal yet</option>
              {Object.entries(RELATIONSHIP_GOAL_LABELS).map(([k, label]) => (
                <option key={k} value={k}>{label}</option>
              ))}
            </select>
          </FieldRow>
          <FieldRow label="They prefer">
            <select
              value={form.communication_pref}
              onChange={(e) => set('communication_pref', e.target.value as Form['communication_pref'])}
              className={inputClass}
            >
              <option value="">Not sure yet</option>
              {Object.entries(COMMUNICATION_PREF_LABELS).map(([k, label]) => (
                <option key={k} value={k}>{label}</option>
              ))}
            </select>
          </FieldRow>
        </div>

        <FieldRow
          label="Notes"
          hint="Personality, things they care about, anything you want to remember."
        >
          <textarea
            rows={4}
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            className={inputClass}
          />
        </FieldRow>

        {error && <p className="text-sm text-terracotta-700">{error}</p>}

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            className="btn-ghost"
            onClick={() => nav('/relationships/people')}
          >
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={busy || !form.full_name.trim()}>
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </section>
  );
}
