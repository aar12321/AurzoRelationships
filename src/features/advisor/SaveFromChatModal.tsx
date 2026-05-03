// SaveFromChatModal — the preview-confirm surface the walkthrough asked
// for: when the user is chatting with the advisor and mentions doing
// something with someone ("had dinner with Sarah", "thinking about
// getting Mike whisky for his birthday"), they can tap a quick action
// under their message and this modal opens pre-filled. Nothing writes
// to the user's data until they explicitly confirm.

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useDatesStore } from '@/stores/datesStore';
import { useGiftsStore } from '@/stores/giftsStore';
import { useMemoriesStore } from '@/stores/memoriesStore';
import { usePeopleStore } from '@/stores/peopleStore';
import { friendlyError } from '@/services/friendlyError';
import { toast } from '@/stores/toastStore';
import FieldRow, { inputClass } from '@/features/people/form/FieldRow';
import type { MemoryType } from '@/types/memories';
import { MEMORY_TYPE_LABELS } from '@/types/memories';
import type { DateType } from '@/types/dates';
import { DATE_TYPE_LABELS } from '@/types/dates';

export type SaveKind = 'memory' | 'gift' | 'date';

type Props = {
  kind: SaveKind;
  sourceText: string;          // the user's chat message we're saving from
  onClose: () => void;
};

export default function SaveFromChatModal({ kind, sourceText, onClose }: Props) {
  const { user } = useAuthStore();
  const people = usePeopleStore((s) => s.people);

  // Person inferred client-side from the message (case-insensitive match
  // on first names / full names). Best-effort — user can override.
  const inferredPid = inferPersonId(sourceText, people.map((p) => ({ id: p.id, name: p.full_name }))) ?? '';
  const [pid, setPid] = useState<string>(inferredPid);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Memory fields
  const addMemory = useMemoriesStore((s) => s.add);
  const [memNote, setMemNote] = useState(sourceText);
  const [memType, setMemType] = useState<MemoryType>('everyday');

  // Gift fields
  const addGift = useGiftsStore((s) => s.addIdea);
  const [giftTitle, setGiftTitle] = useState(extractGiftTitle(sourceText));
  const [giftReason, setGiftReason] = useState(sourceText);
  const [giftCost, setGiftCost] = useState<string>('');

  // Date fields
  const addDate = useDatesStore((s) => s.add);
  const [dateLabel, setDateLabel] = useState(extractDateLabel(sourceText));
  const [dateType, setDateType] = useState<DateType>('custom');
  const [dateOn, setDateOn] = useState('');

  useEffect(() => {
    setPid(inferredPid);
  }, [inferredPid]);

  async function confirm() {
    if (!user) return;
    setBusy(true); setErr(null);
    try {
      if (kind === 'memory') {
        if (!memNote.trim()) throw new Error('Add a short note about what happened.');
        await addMemory({
          title: null,
          note: memNote.trim(),
          memory_type: memType,
          occurred_on: todayIso(),
          location: null,
          photo_urls: [],
          person_ids: pid ? [pid] : [],
        }, user.id);
        toast.success('Memory saved.');
      } else if (kind === 'gift') {
        if (!pid) throw new Error('Pick who this gift is for.');
        if (!giftTitle.trim()) throw new Error('Give the gift idea a name.');
        await addGift({
          person_id: pid,
          title: giftTitle.trim(),
          reason: giftReason.trim() || null,
          source: 'ai',
          estimated_cost: giftCost ? Number(giftCost) : null,
        }, user.id);
        toast.success('Saved to their idea list.');
      } else if (kind === 'date') {
        if (!dateLabel.trim()) throw new Error('Give the date a short label.');
        if (!dateOn) throw new Error('Pick when this happens.');
        await addDate({
          person_id: pid || null,
          label: dateLabel.trim(),
          date_type: dateType,
          event_date: dateOn,
          recurring: dateType === 'birthday' || dateType === 'anniversary',
          lead_times: [14, 7, 3, 0],
          notes: null,
        }, user.id);
        toast.success('Date added — we will remind you.');
      }
      onClose();
    } catch (e) {
      setErr(friendlyError(e, 'Could not save.'));
    } finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center
                    bg-charcoal-900/40 backdrop-blur-sm dark:bg-charcoal-950/70 p-4"
         onClick={onClose} role="dialog" aria-modal="true">
      <div onClick={(e) => e.stopPropagation()}
           className="w-full max-w-lg card-journal animate-bloom">
        <div className="mb-3">
          <h2 className="font-serif text-2xl text-charcoal-900 dark:text-cream-50">
            {kind === 'memory' && 'Save this as a memory'}
            {kind === 'gift' && 'Save this as a gift idea'}
            {kind === 'date' && 'Add this as a date to remember'}
          </h2>
          <p className="text-xs text-charcoal-500 dark:text-charcoal-300 mt-0.5">
            Nothing has been saved yet — review the details below and confirm.
            Edit any field before tapping save.
          </p>
        </div>

        <div className="space-y-4">
          <FieldRow label="Who is this about?" hint="We guessed from your message — change if needed.">
            <select value={pid} onChange={(e) => setPid(e.target.value)} className={inputClass}>
              <option value="">{kind === 'date' ? 'No specific person' : 'Pick someone…'}</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>{p.full_name}</option>
              ))}
            </select>
          </FieldRow>

          {kind === 'memory' && (
            <>
              <FieldRow label="What happened" hint="Say it in your own words.">
                <textarea rows={3} value={memNote} onChange={(e) => setMemNote(e.target.value)}
                  className={inputClass} />
              </FieldRow>
              <FieldRow label="Kind">
                <select value={memType} onChange={(e) => setMemType(e.target.value as MemoryType)}
                  className={inputClass}>
                  {Object.entries(MEMORY_TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </FieldRow>
            </>
          )}

          {kind === 'gift' && (
            <>
              <FieldRow label="Gift idea">
                <input value={giftTitle} onChange={(e) => setGiftTitle(e.target.value)}
                  className={inputClass} placeholder="e.g. Pour-over coffee kit" />
              </FieldRow>
              <FieldRow label="Why it fits" hint="A line so future you remembers.">
                <input value={giftReason} onChange={(e) => setGiftReason(e.target.value)}
                  className={inputClass} />
              </FieldRow>
              <FieldRow label="Estimated cost">
                <input type="number" min="0" step="5" value={giftCost}
                  onChange={(e) => setGiftCost(e.target.value)} className={inputClass} />
              </FieldRow>
            </>
          )}

          {kind === 'date' && (
            <>
              <FieldRow label="Label">
                <input value={dateLabel} onChange={(e) => setDateLabel(e.target.value)}
                  className={inputClass} placeholder="e.g. Sarah's birthday" />
              </FieldRow>
              <FieldRow label="Kind">
                <select value={dateType} onChange={(e) => setDateType(e.target.value as DateType)}
                  className={inputClass}>
                  {Object.entries(DATE_TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </FieldRow>
              <FieldRow label="When">
                <input type="date" value={dateOn}
                  onChange={(e) => setDateOn(e.target.value)} className={inputClass} />
              </FieldRow>
            </>
          )}

          {err && <p className="text-sm text-terracotta-700 dark:text-terracotta-300">{err}</p>}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          <button type="button" onClick={() => void confirm()} disabled={busy} className="btn-primary">
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

function inferPersonId(text: string, people: { id: string; name: string }[]): string | null {
  const lower = ` ${text.toLowerCase()} `;
  for (const p of people) {
    const full = p.name.toLowerCase();
    const first = full.split(/\s+/)[0];
    if (full && lower.includes(` ${full} `)) return p.id;
    if (first && lower.includes(` ${first} `)) return p.id;
  }
  return null;
}

function extractGiftTitle(text: string): string {
  const m = text.match(/(?:get|gift|buy|gettin?g|give)[\s\w]*?\s+([a-z0-9' \-]{3,40})/i);
  return m?.[1]?.trim() ?? '';
}

function extractDateLabel(text: string): string {
  const m = text.match(/(birthday|anniversary|graduation|wedding|baby|moving|new job)/i);
  return m ? m[0].charAt(0).toUpperCase() + m[0].slice(1) : '';
}

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
