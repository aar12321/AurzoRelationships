import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useEventsStore } from '@/stores/eventsStore';
import type { EventType } from '@/types/events';
import { EVENT_TYPE_LABELS } from '@/types/events';
import FieldRow, { inputClass } from '@/features/people/form/FieldRow';

export default function CreateEventPage() {
  const nav = useNavigate();
  const { user } = useAuthStore();
  const add = useEventsStore((s) => s.add);

  const [name, setName] = useState('');
  const [type, setType] = useState<EventType>('dinner');
  const [when, setWhen] = useState('');
  const [loc, setLoc] = useState('');
  const [budget, setBudget] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true); setErr(null);
    try {
      const ev = await add({
        name: name.trim(),
        event_type: type,
        starts_at: when ? new Date(when).toISOString() : null,
        location: loc.trim() || null,
        budget: budget ? Number(budget) : null,
        notes: notes.trim() || null,
      }, user.id);
      nav(`/relationships/events/${ev.id}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Save failed');
      setBusy(false);
    }
  }

  return (
    <section className="animate-bloom max-w-2xl">
      <header className="mb-6">
        <h1 className="text-4xl">New event</h1>
        <p className="text-charcoal-500 mt-1">Guests, tasks, budget, timeline — all in one place.</p>
      </header>
      <form onSubmit={submit} className="card-journal space-y-4">
        <FieldRow label="Name">
          <input required autoFocus value={name} onChange={(e) => setName(e.target.value)}
            className={inputClass} placeholder="e.g. Rooftop dinner for Sarah's birthday" />
        </FieldRow>
        <div className="grid sm:grid-cols-2 gap-4">
          <FieldRow label="Kind">
            <select value={type} onChange={(e) => setType(e.target.value as EventType)}
              className={inputClass}>
              {Object.entries(EVENT_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </FieldRow>
          <FieldRow label="When">
            <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)}
              className={inputClass} />
          </FieldRow>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <FieldRow label="Where">
            <input value={loc} onChange={(e) => setLoc(e.target.value)} className={inputClass} />
          </FieldRow>
          <FieldRow label="Budget">
            <input type="number" min="0" step="1" value={budget}
              onChange={(e) => setBudget(e.target.value)} className={inputClass} />
          </FieldRow>
        </div>
        <FieldRow label="Notes">
          <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)}
            className={inputClass} />
        </FieldRow>
        {err && <p className="text-sm text-terracotta-700">{err}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-ghost"
            onClick={() => nav('/relationships/events')}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={busy || !name}>
            {busy ? 'Creating…' : 'Create event'}
          </button>
        </div>
      </form>
    </section>
  );
}
