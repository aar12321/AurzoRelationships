import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import {
  acceptLink, addBucket, addCheckin, listBucket, listCheckins,
  myLink, proposeLink, revokeLink, toggleBucket,
} from '@/services/couplesService';
import type { BucketItem, CoupleCheckin, PartnerLink } from '@/types/couples';
import FieldRow, { inputClass } from '@/features/people/form/FieldRow';

export default function CouplesPage() {
  const { user } = useAuthStore();
  const [link, setLink] = useState<PartnerLink | null>(null);
  const [loading, setLoading] = useState(true);
  const [partnerId, setPartnerId] = useState('');
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    void myLink().then((l) => { setLink(l); setLoading(false); });
  }, []);

  async function propose() {
    if (!user || !partnerId) return;
    try {
      const l = await proposeLink(user.id, partnerId);
      setLink(l);
      setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not propose link');
    }
  }

  async function accept() {
    if (!user || !link) return;
    const side = link.user_a === user.id ? 'a' : 'b';
    setLink(await acceptLink(link.id, side));
  }

  async function revoke() {
    if (!link) return;
    await revokeLink(link.id);
    setLink(null);
  }

  if (loading) return <div className="text-charcoal-500 text-sm">Loading…</div>;

  if (!link) {
    return (
      <section className="animate-bloom max-w-xl">
        <header className="mb-6">
          <h1 className="text-4xl">Couples</h1>
          <p className="text-charcoal-500 mt-1">A private space, just for two.</p>
        </header>
        <div className="card-journal space-y-4">
          <p className="text-charcoal-700">
            To open couples mode, both of you need to consent. Enter your partner's Aurzo
            user id (they can share it from their Settings page).
          </p>
          <FieldRow label="Partner's user id" hint="Your partner can copy this from their Settings → Account. Email lookup is coming once the Aurzo directory ships.">
            <input value={partnerId} onChange={(e) => setPartnerId(e.target.value)}
              className={inputClass} placeholder="uuid" />
          </FieldRow>
          {err && <p className="text-sm text-terracotta-700">{err}</p>}
          <button onClick={propose} className="btn-primary w-full" disabled={!partnerId}>
            Send invitation
          </button>
        </div>
      </section>
    );
  }

  if (!link.active) {
    const iAccepted =
      (link.user_a === user?.id && link.a_consented_at) ||
      (link.user_b === user?.id && link.b_consented_at);
    return (
      <section className="animate-bloom max-w-xl">
        <header className="mb-6">
          <h1 className="text-4xl">Couples</h1>
        </header>
        <div className="card-journal space-y-3">
          {iAccepted ? (
            <p className="text-charcoal-700">
              Waiting for your partner to accept. Couples mode unlocks once they do.
            </p>
          ) : (
            <>
              <p className="text-charcoal-700">Your partner invited you into couples mode.</p>
              <button onClick={accept} className="btn-primary w-full">Accept</button>
            </>
          )}
          <button onClick={revoke} className="btn-ghost w-full">Cancel</button>
        </div>
      </section>
    );
  }

  return <ActiveCouple link={link} />;
}

function ActiveCouple({ link }: { link: PartnerLink }) {
  const { user } = useAuthStore();
  const [checkins, setCheckins] = useState<CoupleCheckin[]>([]);
  const [bucket, setBucket] = useState<BucketItem[]>([]);
  const [score, setScore] = useState(7);
  const [appreciation, setAppreciation] = useState('');
  const [newItem, setNewItem] = useState('');

  useEffect(() => {
    void listCheckins(link.id).then(setCheckins);
    void listBucket(link.id).then(setBucket);
  }, [link.id]);

  async function submitCheckin() {
    if (!user) return;
    await addCheckin(link.id, user.id, score, appreciation);
    setAppreciation('');
    setCheckins(await listCheckins(link.id));
  }

  async function submitBucket() {
    if (!newItem.trim()) return;
    await addBucket(link.id, newItem.trim());
    setNewItem('');
    setBucket(await listBucket(link.id));
  }

  async function togItem(it: BucketItem) {
    await toggleBucket(it.id, !it.done);
    setBucket(await listBucket(link.id));
  }

  return (
    <section className="animate-bloom">
      <header className="mb-6">
        <h1 className="text-4xl">Couples</h1>
        <p className="text-charcoal-500 mt-1">Just for two.</p>
      </header>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card-journal">
          <h2 className="font-serif text-2xl mb-3">Weekly check-in</h2>
          <p className="text-xs text-charcoal-500 mb-3">
            How connected did this week feel? What's one thing you appreciate?
          </p>
          <label className="block mb-3">
            <span className="text-xs text-charcoal-500">Connection ({score}/10)</span>
            <input type="range" min="1" max="10" value={score}
              onChange={(e) => setScore(Number(e.target.value))} className="w-full" />
          </label>
          <textarea rows={3} value={appreciation} onChange={(e) => setAppreciation(e.target.value)}
            placeholder="One thing I appreciate this week…"
            className={inputClass} />
          <button onClick={submitCheckin} className="btn-primary mt-3 w-full"
            disabled={!appreciation}>
            Share
          </button>
          {checkins.length > 0 && (
            <div className="mt-4 space-y-2 text-sm">
              {checkins.slice(0, 5).map((c) => (
                <div key={c.id} className="border-t border-cream-200 pt-2">
                  <div className="text-xs text-charcoal-500">
                    {c.connection_score}/10 · {new Date(c.created_at).toLocaleDateString()}
                  </div>
                  <p className="text-charcoal-700">{c.appreciation}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card-journal">
          <h2 className="font-serif text-2xl mb-3">Bucket list</h2>
          <ul className="space-y-1">
            {bucket.map((b) => (
              <li key={b.id} className="flex items-center gap-2">
                <input type="checkbox" checked={b.done} onChange={() => void togItem(b)} />
                <span className={b.done ? 'line-through text-charcoal-500' : ''}>{b.title}</span>
              </li>
            ))}
          </ul>
          <div className="flex gap-2 mt-4">
            <input value={newItem} onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), void submitBucket())}
              placeholder="Something to do together…"
              className="flex-1 rounded border border-cream-200 bg-ivory-50 px-2 py-1 text-sm" />
            <button onClick={submitBucket} className="btn-primary text-xs" disabled={!newItem.trim()}>
              Add
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
