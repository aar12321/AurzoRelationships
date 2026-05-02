import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useMemoriesStore } from '@/stores/memoriesStore';
import { usePeopleStore } from '@/stores/peopleStore';
import { uploadMemoryPhoto } from '@/services/memoriesService';
import { toast } from '@/stores/toastStore';
import type { MemoryType } from '@/types/memories';
import { MEMORY_TYPE_EMOJI, MEMORY_TYPE_LABELS } from '@/types/memories';
import FieldRow, { inputClass } from '@/features/people/form/FieldRow';

type Props = { personId?: string; onDone?: () => void };

export default function AddMemoryForm({ personId, onDone }: Props) {
  const { user } = useAuthStore();
  const add = useMemoriesStore((s) => s.add);
  const people = usePeopleStore((s) => s.people);

  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [type, setType] = useState<MemoryType>('everyday');
  const [when, setWhen] = useState('');
  const [loc, setLoc] = useState('');
  const [pids, setPids] = useState<string[]>(personId ? [personId] : []);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

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
    setBusy(true); setErr(null);
    try {
      // Upload the photo first so we can attach the URL on insert. A
      // failed upload doesn't block the save — we just toast a warning
      // and store the memory without it.
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
        occurred_on: when || null,
        location: loc.trim() || null,
        photo_urls: photoUrl ? [photoUrl] : [],
        person_ids: pids,
      }, user.id);
      if (photoFailed) toast.error('Saved, but the photo failed to upload.');
      setTitle(''); setNote(''); setWhen(''); setLoc('');
      setPhoto(null); setPreview(null);
      onDone?.();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Save failed');
    } finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="card-journal space-y-4">
      <FieldRow label="Title" hint="A short name — or leave blank for just a note.">
        <input value={title} onChange={(e) => setTitle(e.target.value)}
          className={inputClass} placeholder="e.g. Late-night drive after Sarah's wedding" />
      </FieldRow>
      <FieldRow label="What happened">
        <textarea rows={4} value={note} onChange={(e) => setNote(e.target.value)}
          className={inputClass} />
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
        <FieldRow label="When">
          <input type="date" value={when} onChange={(e) => setWhen(e.target.value)}
            className={inputClass} />
        </FieldRow>
        <FieldRow label="Where">
          <input value={loc} onChange={(e) => setLoc(e.target.value)} className={inputClass} />
        </FieldRow>
      </div>
      <FieldRow label="With whom" hint="Tap to include.">
        <div className="flex flex-wrap gap-2">
          {people.map((p) => (
            <button key={p.id} type="button" onClick={() => togglePerson(p.id)}
              className={[
                'rounded-full border px-3 py-1 text-xs transition-colors',
                pids.includes(p.id)
                  ? 'bg-terracotta-600 border-terracotta-600 text-ivory-50'
                  : 'bg-ivory-50 border-cream-200 text-charcoal-700',
              ].join(' ')}>
              {p.full_name}
            </button>
          ))}
        </div>
      </FieldRow>
      <FieldRow label="Photo" hint="Optional — one image.">
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
      {err && <p className="text-sm text-terracotta-700">{err}</p>}
      <div className="flex justify-end gap-2">
        {onDone && <button type="button" className="btn-ghost" onClick={onDone}>Cancel</button>}
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? 'Saving…' : 'Save memory'}
        </button>
      </div>
    </form>
  );
}
