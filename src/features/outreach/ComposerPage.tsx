import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { usePeopleStore } from '@/stores/peopleStore';
import type { Channel, Occasion, Tone } from '@/types/outreach';
import {
  CHANNEL_LABELS, OCCASION_LABELS, TONE_LABELS,
} from '@/types/outreach';
import { draftVariants, saveMessage } from '@/services/outreachService';
import { aiCompose } from '@/services/aiService';
import FieldRow, { inputClass } from '@/features/people/form/FieldRow';

export default function ComposerPage() {
  const { id } = useParams();
  const { user } = useAuthStore();
  const people = usePeopleStore((s) => s.people);
  const loadPeople = usePeopleStore((s) => s.loadAll);

  const [pid, setPid] = useState<string>(id ?? '');
  const [occasion, setOccasion] = useState<Occasion>('thinking_of_you');
  const [tone, setTone] = useState<Tone>('warm');
  const [channel, setChannel] = useState<Channel>('text');
  const [active, setActive] = useState(0);
  const [copied, setCopied] = useState(false);
  const [variants, setVariants] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    if (people.length === 0) void loadPeople();
  }, [loadPeople, people.length]);

  const person = useMemo(() => people.find((p) => p.id === pid), [people, pid]);

  useEffect(() => {
    if (!person) { setVariants([]); return; }
    let cancelled = false;
    setAiLoading(true); setAiError(null);
    aiCompose(person, occasion, tone, channel)
      .then((v) => { if (!cancelled && v.length > 0) setVariants(v); else
        setVariants(draftVariants(person, occasion, tone, channel)); })
      .catch((e) => {
        if (cancelled) return;
        setAiError(e instanceof Error ? e.message : 'AI unavailable — using local drafts.');
        setVariants(draftVariants(person, occasion, tone, channel));
      })
      .finally(() => { if (!cancelled) setAiLoading(false); });
    return () => { cancelled = true; };
  }, [person, occasion, tone, channel]);

  async function copy(body: string) {
    try {
      await navigator.clipboard.writeText(body);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  }

  async function markSent(body: string) {
    if (!user || !person) return;
    await saveMessage({
      person_id: person.id,
      occasion, tone, channel, body,
      sent_at: new Date().toISOString(),
    }, user.id);
  }

  return (
    <section className="animate-bloom max-w-3xl">
      {id && person && (
        <Link to={`/relationships/people/${person.id}`} className="text-xs text-charcoal-500">
          ← {person.full_name}
        </Link>
      )}
      <header className="mb-6 mt-1">
        <h1 className="text-4xl">
          {person ? `Write to ${person.full_name.split(' ')[0]}` : 'Compose'}
        </h1>
        <p className="text-charcoal-500 mt-1">
          Personal, not generic. Pick the shape — we'll draft three variants.
        </p>
      </header>

      <div className="card-journal space-y-4 mb-6">
        {!id && (
          <FieldRow label="Who">
            <select value={pid} onChange={(e) => setPid(e.target.value)} className={inputClass}>
              <option value="">Pick someone</option>
              {people.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
            </select>
          </FieldRow>
        )}
        <div className="grid sm:grid-cols-3 gap-4">
          <FieldRow label="Occasion">
            <select value={occasion} onChange={(e) => setOccasion(e.target.value as Occasion)}
              className={inputClass}>
              {Object.entries(OCCASION_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </FieldRow>
          <FieldRow label="Tone">
            <select value={tone} onChange={(e) => setTone(e.target.value as Tone)}
              className={inputClass}>
              {Object.entries(TONE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </FieldRow>
          <FieldRow label="Channel">
            <select value={channel} onChange={(e) => setChannel(e.target.value as Channel)}
              className={inputClass}>
              {Object.entries(CHANNEL_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </FieldRow>
        </div>
      </div>

      {!person ? (
        <div className="card-journal text-charcoal-500 text-sm">
          Pick someone to see drafts.
        </div>
      ) : aiLoading && variants.length === 0 ? (
        <div className="card-journal text-charcoal-500 text-sm">Drafting with Claude…</div>
      ) : (
        <>
          {aiError && (
            <div className="mb-3 text-xs text-charcoal-500">{aiError}</div>
          )}
          <div className="flex gap-2 mb-3">
            {variants.map((_, i) => (
              <button key={i} onClick={() => setActive(i)}
                className={[
                  'flex-1 rounded-journal border px-3 py-2 text-sm',
                  active === i
                    ? 'bg-terracotta-600 border-terracotta-600 text-ivory-50'
                    : 'bg-ivory-50 border-cream-200 text-charcoal-700',
                ].join(' ')}>
                Variant {i + 1}
              </button>
            ))}
          </div>
          <div className="card-journal">
            <pre className="whitespace-pre-wrap font-sans text-charcoal-700 leading-relaxed">
              {variants[active]}
            </pre>
            <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t border-cream-200">
              <button className="btn-ghost" onClick={() => void markSent(variants[active])}>
                I sent this
              </button>
              <button className="btn-primary" onClick={() => void copy(variants[active])}>
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
