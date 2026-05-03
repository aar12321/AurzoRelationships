// Capture a moment — a single-screen modal for quickly logging a memory
// from anywhere in the app. Text-first; a photo is optional and uploads
// are graceful (if the 'memories' storage bucket isn't configured the
// memory still saves as text).
//
// Trigger sources: ⌘K action, header FAB, and programmatic open with a
// pre-selected person (e.g. from a Person profile page).

import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useCaptureMomentStore } from '@/stores/captureMomentStore';
import { useMemoriesStore } from '@/stores/memoriesStore';
import { usePeopleStore } from '@/stores/peopleStore';
import { uploadMemoryPhoto } from '@/services/memoriesService';
import { toast } from '@/stores/toastStore';
import type { MemoryType } from '@/types/memories';
import { MEMORY_TYPE_EMOJI, MEMORY_TYPE_LABELS } from '@/types/memories';

const TYPES: MemoryType[] = ['adventure', 'milestone', 'everyday', 'tradition', 'first_time', 'last_time'];

export default function CaptureMomentModal() {
  const { open, preselectPersonId, closeCapture } = useCaptureMomentStore();
  const { user } = useAuthStore();
  const add = useMemoriesStore((s) => s.add);
  const people = usePeopleStore((s) => s.people);
  const loadPeople = usePeopleStore((s) => s.loadAll);

  const [title, setTitle] = useState('');
  const [note, setNote]   = useState('');
  const [mtype, setMtype] = useState<MemoryType>('everyday');
  const [when, setWhen]   = useState(() => new Date().toISOString().slice(0, 10));
  const [tagged, setTagged] = useState<string[]>([]);
  const [photo, setPhoto]   = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy]   = useState(false);
  const [err, setErr]     = useState<string | null>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) return;
    setTitle(''); setNote(''); setMtype('everyday'); setErr(null);
    setWhen(new Date().toISOString().slice(0, 10));
    setTagged(preselectPersonId ? [preselectPersonId] : []);
    setPhoto(null); setPreview(null);
    if (people.length === 0) void loadPeople();
    setTimeout(() => noteRef.current?.focus(), 50);
  }, [open, preselectPersonId]); // eslint-disable-line react-hooks/exhaustive-deps

  function onPhoto(file: File | null) {
    setPhoto(file);
    if (!file) { setPreview(null); return; }
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  function togglePerson(id: string) {
    setTagged((t) => (t.includes(id) ? t.filter((x) => x !== id) : [...t, id]));
  }

  async function save() {
    if (!user || (!note.trim() && !title.trim())) return;
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
        note:  note.trim()  || null,
        memory_type: mtype,
        occurred_on: when,
        photo_urls: photoUrl ? [photoUrl] : [],
        person_ids: tagged,
      }, user.id);
      // The memory itself saved — but if the user added a photo and it
      // failed silently we surface it now so they know it's missing
      // before they leave the form.
      if (photoFailed) {
        toast.error('Saved, but the photo failed to upload.');
      }
      closeCapture();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not save');
    } finally { setBusy(false); }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center sm:justify-center
                    bg-charcoal-900/40 backdrop-blur-sm p-0 sm:p-4
                    dark:bg-charcoal-950/70"
         onClick={closeCapture} role="dialog" aria-modal="true" aria-label="Capture moment">
      <div onClick={(e) => e.stopPropagation()}
           className="w-full sm:max-w-lg card-journal p-0 rounded-t-journal sm:rounded-journal
                      animate-bloom overflow-hidden max-h-[95vh] flex flex-col">
        <header className="px-5 py-3 border-b border-cream-200 dark:border-charcoal-700
                           flex items-center justify-between">
          <h2 className="font-serif text-xl text-charcoal-900 dark:text-cream-50">
            Capture a moment
          </h2>
          <button onClick={closeCapture} className="btn-ghost text-xs py-1">Close</button>
        </header>

        <div className="px-5 py-4 overflow-y-auto space-y-4">
          <textarea ref={noteRef} value={note} onChange={(e) => setNote(e.target.value)}
            placeholder="What happened? A line or a paragraph — your call."
            rows={3}
            className="w-full rounded-journal border border-cream-200 dark:border-charcoal-700
                       bg-ivory-50 dark:bg-charcoal-800 px-3 py-2 outline-none resize-none" />

          <input value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (optional)"
            className="w-full rounded-journal border border-cream-200 dark:border-charcoal-700
                       bg-ivory-50 dark:bg-charcoal-800 px-3 py-2 text-sm outline-none" />

          <div className="grid sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs uppercase tracking-wider text-charcoal-500 dark:text-charcoal-300">
                When
              </span>
              <input type="date" value={when} onChange={(e) => setWhen(e.target.value)}
                className="mt-1 w-full rounded-journal border border-cream-200 dark:border-charcoal-700
                           bg-ivory-50 dark:bg-charcoal-800 px-3 py-2 text-sm outline-none" />
            </label>
            <div>
              <span className="text-xs uppercase tracking-wider text-charcoal-500 dark:text-charcoal-300">
                Kind
              </span>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {TYPES.map((t) => {
                  const isSelected = mtype === t;
                  return (
                    <button key={t} type="button" onClick={() => setMtype(t)}
                      aria-pressed={isSelected}
                      className={[
                        'chip text-[11px] transition-all',
                        isSelected
                          ? '!bg-terracotta-600 !text-ivory-50 !border-terracotta-700 ring-2 ring-terracotta-400/40 font-medium shadow-sm'
                          : 'hover:bg-cream-100 dark:hover:bg-charcoal-700',
                      ].join(' ')}>
                      <span className="mr-1" aria-hidden>{MEMORY_TYPE_EMOJI[t]}</span>
                      {MEMORY_TYPE_LABELS[t]}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {people.length > 0 && (
            <div>
              <span className="text-xs uppercase tracking-wider text-charcoal-500 dark:text-charcoal-300">
                Who was there
              </span>
              <div className="mt-1 flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                {people.map((p) => (
                  <button key={p.id} onClick={() => togglePerson(p.id)}
                    className={[
                      'chip text-[11px] transition-colors',
                      tagged.includes(p.id)
                        ? 'bg-gold-500 text-ivory-50 border-gold-500' : '',
                    ].join(' ')}>
                    {p.full_name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <span className="text-xs uppercase tracking-wider text-charcoal-500 dark:text-charcoal-300">
              Photo (optional)
            </span>
            <input type="file" accept="image/*"
              onChange={(e) => onPhoto(e.target.files?.[0] ?? null)}
              className="mt-1 block text-xs" />
            {preview && (
              <img src={preview} alt=""
                className="mt-2 max-h-40 rounded-journal border border-cream-200 dark:border-charcoal-700" />
            )}
          </div>

          {err && <p className="text-xs text-terracotta-700 dark:text-terracotta-300">{err}</p>}
        </div>

        <footer className="px-5 py-3 border-t border-cream-200 dark:border-charcoal-700
                           flex items-center justify-end gap-2">
          <button onClick={closeCapture} disabled={busy} className="btn-ghost">Cancel</button>
          <button onClick={() => void save()}
            disabled={busy || (!note.trim() && !title.trim())}
            className="btn-primary">
            {busy ? 'Saving…' : 'Save moment'}
          </button>
        </footer>
      </div>
    </div>
  );
}
