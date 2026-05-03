// AddMemoryForm — capture a memory in one step. The walkthrough asked
// for "faster and easier" so the form opens with just a single textarea
// + Save. Title, kind, date, location, photo, and people-tagging live
// inside a collapsible "Add details" drawer so a user who just wants
// to jot a moment can do it with two taps.

import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useMemoriesStore } from '@/stores/memoriesStore';
import { usePeopleStore } from '@/stores/peopleStore';
import { uploadMemoryPhoto } from '@/services/memoriesService';
import { friendlyError } from '@/services/friendlyError';
import { toast } from '@/stores/toastStore';
import type { MemoryType } from '@/types/memories';
import { MEMORY_TYPE_EMOJI, MEMORY_TYPE_LABELS } from '@/types/memories';
import FieldRow, { inputClass } from '@/features/people/form/FieldRow';

type Props = { personId?: string; onDone?: () => void };

export default function AddMemoryForm({ personId, onDone }: Props) {
  const { user } = useAuthStore();
  const add = useMemoriesStore((s) => s.add);
  const people = usePeopleStore((s) => s.people);

  const [note, setNote] = useState('');
  const [title, setTitle] = useState('');
  const [type, setType] = useState<MemoryType>('everyday');
  const [when, setWhen] = useState('');
  const [loc, setLoc] = useState('');
  const [pids, setPids] = useState<string[]>(personId ? [personId] : []);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  function togglePerson(id: string) {
    setPids((curr) => curr.includes(id) ? curr.filter((x) => x !== id) : [...curr, id]);
  }

  function onPhoto(file: File | null) {
    setPhoto(file);
    if (!file) { setPreview(null); return; }
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!note.trim() && !title.trim()) {
      setErr('Write a quick note about what happened — anything is fine.');
      return;
    }
    setBusy(true); setErr(null);
    try {
      let photoUrl: string | null = null;
      let photoFailed = false;
      if (photo) {
        photoUrl = await uploadMemoryPhoto(photo, user.id);
        photoFailed = photoUrl == null;
      }
      await add({
        title: title.trim() || null,
        note: note.trim() || null,
        memory_type: type,
        occurred_on: when || todayIso(),
        location: loc.trim() || null,
        photo_urls: photoUrl ? [photoUrl] : [],
        person_ids: pids,
      }, user.id);
      if (photoFailed) toast.error('Saved, but the photo failed to upload.');
      else toast.success('Memory saved.');
      setTitle(''); setNote(''); setWhen(''); setLoc('');
      setPhoto(null); setPreview(null);
      setShowDetails(false);
      onDone?.();
    } catch (err) {
      const msg = friendlyError(err, 'Could not save the memory.');
      setErr(msg);
      toast.error(msg);
    } finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="card-journal space-y-3">
      <div>
        <label className="block">
          <span className="text-xs uppercase tracking-wider text-charcoal-500 dark:text-charcoal-300">
            What happened?
          </span>
          <textarea
            autoFocus
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Late-night drive after Sarah's wedding. She told me she's pregnant."
            className={inputClass + ' mt-1'}
          />
        </label>
        <p className="text-xs text-charcoal-500 dark:text-charcoal-300 mt-1.5">
          Even one sentence is enough. We'll save today's date by default — add more below if you want.
        </p>
      </div>

      <div>
        <button
          type="button"
          onClick={() => setShowDetails((v) => !v)}
          className="text-xs text-charcoal-600 dark:text-charcoal-300 hover:underline
                     flex items-center gap-1"
          aria-expanded={showDetails}
        >
          <span aria-hidden>{showDetails ? '▾' : '▸'}</span>
          {showDetails ? 'Hide details' : 'Add details (title, kind, date, photo, who)'}
        </button>
      </div>

      {showDetails && (
        <div className="space-y-4 animate-bloom border-t border-cream-200 dark:border-charcoal-700 pt-4">
          <FieldRow label="Title" hint="Optional headline you'll see when scrolling memories.">
            <input value={title} onChange={(e) => setTitle(e.target.value)}
              className={inputClass} placeholder="e.g. Late-night drive" />
          </FieldRow>
          <div className="grid sm:grid-cols-3 gap-4">
            <FieldRow label="Kind">
              <select value={type} onChange={(e) => setType(e.target.value as MemoryType)}
                className={inputClass}>
                {Object.entries(MEMORY_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{MEMORY_TYPE_EMOJI[k as MemoryType]} {v}</option>
                ))}
              </select>
            </FieldRow>
            <FieldRow label="When" hint="Defaults to today.">
              <input type="date" value={when} onChange={(e) => setWhen(e.target.value)}
                className={inputClass} />
            </FieldRow>
            <FieldRow label="Where">
              <input value={loc} onChange={(e) => setLoc(e.target.value)} className={inputClass} />
            </FieldRow>
          </div>
          {people.length > 0 && (
            <FieldRow label="With whom" hint="Tap to include — they'll see this on their profile.">
              <div className="flex flex-wrap gap-2">
                {people.map((p) => {
                  const on = pids.includes(p.id);
                  return (
                    <button key={p.id} type="button" onClick={() => togglePerson(p.id)}
                      aria-pressed={on}
                      className={[
                        'rounded-full border-2 px-3 py-1 text-xs transition-all',
                        on
                          ? 'bg-terracotta-600 border-terracotta-700 text-ivory-50 font-semibold shadow-sm'
                          : 'bg-ivory-50 border-cream-300 text-charcoal-700 hover:bg-cream-100 dark:bg-charcoal-800 dark:border-charcoal-700 dark:text-cream-100',
                      ].join(' ')}>
                      {on && <span className="mr-1" aria-hidden>✓</span>}
                      {p.full_name}
                    </button>
                  );
                })}
              </div>
            </FieldRow>
          )}
          <FieldRow label="Photo" hint="Optional — one image, up to 10 MB.">
            <div>
              <input type="file" accept="image/*"
                onChange={(e) => onPhoto(e.target.files?.[0] ?? null)}
                className="block text-xs" />
              {preview && (
                <img src={preview} alt=""
                  className="mt-2 max-h-40 rounded-journal border border-cream-200 dark:border-charcoal-700" />
              )}
            </div>
          </FieldRow>
        </div>
      )}

      {err && <p className="text-sm text-terracotta-700 dark:text-terracotta-300">{err}</p>}
      <div className="flex justify-end gap-2 pt-1">
        {onDone && <button type="button" className="btn-ghost" onClick={onDone}>Cancel</button>}
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? 'Saving…' : 'Save memory'}
        </button>
      </div>
    </form>
  );
}

function todayIso(): string {
  const d = new Date();
  // Local-ISO date (YYYY-MM-DD) without timezone shift — Postgres expects
  // a plain date for occurred_on, not a timestamp.
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
