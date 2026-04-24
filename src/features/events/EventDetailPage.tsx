import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useEventsStore } from '@/stores/eventsStore';
import { usePeopleStore } from '@/stores/peopleStore';
import {
  addGuest, addTask, getEvent, listGuests, listTasks, removeGuest, toggleTask, updateRsvp,
} from '@/services/eventsService';
import type { AurzoEvent, EventGuest, EventTask, RSVP } from '@/types/events';
import { EVENT_TYPE_LABELS, RSVP_LABELS } from '@/types/events';
import PersonAvatar from '@/features/people/PersonAvatar';
import ConfirmModal from '@/components/ConfirmModal';
import { toast } from '@/stores/toastStore';

export default function EventDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const people = usePeopleStore((s) => s.people);
  const loadPeople = usePeopleStore((s) => s.loadAll);
  const events = useEventsStore((s) => s.events);
  const loadEvents = useEventsStore((s) => s.load);
  const removeEvent = useEventsStore((s) => s.remove);

  const [ev, setEv] = useState<AurzoEvent | null>(null);
  const [guests, setGuests] = useState<EventGuest[]>([]);
  const [tasks, setTasks] = useState<EventTask[]>([]);
  const [newTask, setNewTask] = useState('');
  const [addPid, setAddPid] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (people.length === 0) void loadPeople();
    if (events.length === 0) void loadEvents();
  }, [loadPeople, loadEvents, people.length, events.length]);

  useEffect(() => {
    if (!id) return;
    void getEvent(id).then(setEv);
    void listGuests(id).then(setGuests);
    void listTasks(id).then(setTasks);
  }, [id]);

  async function addG() {
    if (!id || !user || !addPid) return;
    await addGuest(id, addPid, user.id);
    setGuests(await listGuests(id));
    setAddPid('');
  }
  async function setR(pid: string, rsvp: RSVP) {
    if (!id) return;
    await updateRsvp(id, pid, rsvp);
    setGuests(await listGuests(id));
  }
  async function rmG(pid: string) {
    if (!id) return;
    await removeGuest(id, pid);
    setGuests(await listGuests(id));
  }
  async function addT() {
    if (!id || !user || !newTask.trim()) return;
    await addTask(id, newTask.trim(), user.id, tasks.length);
    setNewTask('');
    setTasks(await listTasks(id));
  }
  async function togT(t: EventTask) {
    await toggleTask(t.id, !t.done);
    if (id) setTasks(await listTasks(id));
  }
  async function handleDelete() {
    if (!id) return;
    setDeleting(true);
    try {
      await removeEvent(id);
      toast.success('Event deleted');
      navigate('/relationships/events');
    } catch (err) {
      setDeleting(false);
      setConfirmDelete(false);
      toast.error(err instanceof Error ? err.message : 'Could not delete event');
    }
  }

  if (!ev) return <div className="text-charcoal-500 text-sm">Loading…</div>;

  const invited = guests.filter((g) => !people.find((p) => p.id === g.person_id) ? false : true);
  const unaddedPeople = people.filter((p) => !guests.find((g) => g.person_id === p.id));

  return (
    <section className="animate-bloom">
      <Link to="/relationships/events" className="text-xs text-charcoal-500">← Events</Link>
      <header className="mb-6 mt-1">
        <h1 className="text-4xl">{ev.name}</h1>
        <div className="text-charcoal-500 mt-1 text-sm">
          {ev.event_type && EVENT_TYPE_LABELS[ev.event_type]}
          {ev.starts_at && <> · {new Date(ev.starts_at).toLocaleString()}</>}
          {ev.location && <> · {ev.location}</>}
          {ev.budget != null && <> · budget ${ev.budget.toFixed(0)}</>}
        </div>
        {ev.notes && <p className="text-charcoal-700 mt-3">{ev.notes}</p>}
      </header>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card-journal">
          <h2 className="font-serif text-2xl mb-3">Guests</h2>
          {invited.length === 0 && (
            <p className="text-sm text-charcoal-500 mb-3">No one invited yet.</p>
          )}
          <div className="space-y-2">
            {invited.map((g) => {
              const p = people.find((x) => x.id === g.person_id);
              if (!p) return null;
              return (
                <div key={g.person_id} className="flex items-center gap-2">
                  <PersonAvatar name={p.full_name} photoUrl={p.photo_url} size="sm" />
                  <span className="flex-1 text-sm">{p.full_name}</span>
                  <select value={g.rsvp} onChange={(e) => void setR(p.id, e.target.value as RSVP)}
                    className="text-xs rounded border border-cream-200 bg-ivory-50 px-1 py-1">
                    {Object.entries(RSVP_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                  <button className="btn-ghost text-xs" onClick={() => void rmG(p.id)}>✕</button>
                </div>
              );
            })}
          </div>
          {unaddedPeople.length > 0 && (
            <div className="mt-4 flex gap-2">
              <select value={addPid} onChange={(e) => setAddPid(e.target.value)}
                className="flex-1 rounded border border-cream-200 bg-ivory-50 px-2 py-1 text-sm">
                <option value="">Add a guest…</option>
                {unaddedPeople.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
              </select>
              <button onClick={addG} className="btn-primary text-xs" disabled={!addPid}>Add</button>
            </div>
          )}
        </div>

        <div className="card-journal">
          <h2 className="font-serif text-2xl mb-3">Tasks</h2>
          {tasks.length === 0 && (
            <p className="text-sm text-charcoal-500 mb-3">Nothing to do yet — add your first.</p>
          )}
          <ul className="space-y-1">
            {tasks.map((t) => (
              <li key={t.id} className="flex items-center gap-2">
                <input type="checkbox" checked={t.done} onChange={() => void togT(t)} />
                <span className={t.done ? 'line-through text-charcoal-500' : ''}>{t.title}</span>
              </li>
            ))}
          </ul>
          <div className="flex gap-2 mt-4">
            <input value={newTask} onChange={(e) => setNewTask(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), void addT())}
              placeholder="Add a task…"
              className="flex-1 rounded border border-cream-200 bg-ivory-50 px-2 py-1 text-sm" />
            <button onClick={addT} className="btn-primary text-xs" disabled={!newTask.trim()}>
              Add
            </button>
          </div>
        </div>
      </div>

      <div className="card-journal mt-6 border border-terracotta-500/20">
        <h2 className="font-serif text-2xl mb-1">Danger zone</h2>
        <p className="text-sm text-charcoal-500 dark:text-charcoal-300 mb-3">
          Deleting this event removes its guests and tasks. This cannot be undone.
        </p>
        <button
          onClick={() => setConfirmDelete(true)}
          className="rounded-journal px-4 py-2 text-sm font-medium border
                     border-terracotta-500/40 text-terracotta-700
                     hover:bg-terracotta-500 hover:text-ivory-50 transition-colors"
        >
          Delete event
        </button>
      </div>

      <ConfirmModal
        open={confirmDelete}
        title={`Delete ${ev.name}?`}
        description="This will remove the event along with its guests and tasks. There's no undo."
        confirmLabel="Delete"
        tone="danger"
        busy={deleting}
        onConfirm={() => void handleDelete()}
        onCancel={() => setConfirmDelete(false)}
      />
    </section>
  );
}
