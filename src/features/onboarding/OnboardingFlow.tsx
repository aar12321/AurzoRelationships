// Onboarding — a soft, 3-step welcome for brand-new users.
// Rendered in place of the Dashboard when profile.onboarded_at is null.
//
// Steps:
//   1. Welcome      — the mission, one sentence, one button
//   2. First person — name + relationship type; the profile page's defaults
//                     are trusted, so just these two fields keep friction low
//   3. First date   — optional; birthday of the person they just added
//
// "Skip for now" is always visible. A user can bail at any step and still
// mark themselves onboarded, because the dashboard's empty state is itself
// a good second-chance invitation.

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { usePeopleStore } from '@/stores/peopleStore';
import { createDate } from '@/services/datesService';
import { updateMyProfile } from '@/services/coreService';
import type { RelationshipType } from '@/types/people';

const TYPES: { value: RelationshipType; label: string }[] = [
  { value: 'close_friend', label: 'Close friend' },
  { value: 'family',       label: 'Family'       },
  { value: 'partner',      label: 'Partner'      },
  { value: 'mentor',       label: 'Mentor'       },
  { value: 'colleague',    label: 'Colleague'    },
  { value: 'reconnecting', label: 'Reconnecting' },
];

export default function OnboardingFlow({ onDone }: { onDone: () => void }) {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const addPerson = usePeopleStore((s) => s.add);

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<RelationshipType>('close_friend');
  const [createdPersonId, setCreatedPersonId] = useState<string | null>(null);
  const [birthday, setBirthday] = useState('');

  async function finish(skipRemaining = false) {
    if (!user) return;
    setBusy(true);
    try {
      await updateMyProfile({ onboarded_at: new Date().toISOString() }, user.id);
      onDone();
      if (skipRemaining && createdPersonId) {
        navigate(`/relationships/people/${createdPersonId}`);
      }
    } finally { setBusy(false); }
  }

  async function saveFirstPerson() {
    if (!user || !name.trim()) return;
    setBusy(true);
    try {
      const p = await addPerson(
        { full_name: name.trim(), relationship_type: type, relationship_goal: 'maintain' },
        user.id,
      );
      setCreatedPersonId(p.id);
      setStep(3);
    } finally { setBusy(false); }
  }

  async function saveFirstBirthday() {
    if (!user || !createdPersonId || !birthday) return;
    setBusy(true);
    try {
      await createDate({
        person_id: createdPersonId,
        label: `${firstName(name) || 'Their'}'s birthday`,
        date_type: 'birthday',
        event_date: birthday,
        recurring: true,
        lead_times: [14, 7, 3, 0],
      }, user.id);
      setStep(4);
    } finally { setBusy(false); }
  }

  return (
    <section className="animate-bloom max-w-xl mx-auto">
      <Progress step={step} />

      {step === 1 && (
        <Card>
          <h1 className="text-4xl mb-2">Welcome to Aurzo Relationships.</h1>
          <p className="text-charcoal-500 dark:text-charcoal-300 mb-6">
            The people who matter most deserve more than reminders. This is your private
            journal for remembering, noticing, and showing up.
          </p>
          <div className="flex gap-3">
            <button onClick={() => setStep(2)} className="btn-primary">Let's begin</button>
            <button onClick={() => void finish()} disabled={busy} className="btn-ghost">
              Skip for now
            </button>
          </div>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <h2 className="text-3xl mb-2">Who comes to mind first?</h2>
          <p className="text-charcoal-500 dark:text-charcoal-300 mb-5 text-sm">
            One person you want to stay close to. You can refine their profile after.
          </p>
          <label className="block mb-4">
            <span className="text-xs uppercase tracking-wider text-charcoal-500">Their name</span>
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-journal border border-cream-200 dark:border-charcoal-700
                         bg-ivory-50 dark:bg-charcoal-800 px-3 py-2 outline-none"
              placeholder="e.g. Alex Chen" />
          </label>
          <label className="block mb-6">
            <span className="text-xs uppercase tracking-wider text-charcoal-500">
              How do you know each other?
            </span>
            <div className="mt-2 flex flex-wrap gap-2">
              {TYPES.map((t) => (
                <button key={t.value} onClick={() => setType(t.value)}
                  className={[
                    'chip transition-colors',
                    type === t.value ? 'bg-terracotta-500 text-ivory-50 border-terracotta-500' : '',
                  ].join(' ')}>
                  {t.label}
                </button>
              ))}
            </div>
          </label>
          <div className="flex gap-3">
            <button onClick={() => void saveFirstPerson()}
              disabled={busy || !name.trim()} className="btn-primary">
              Add {firstName(name) || 'them'}
            </button>
            <button onClick={() => void finish()} disabled={busy} className="btn-ghost">
              Skip
            </button>
          </div>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <h2 className="text-3xl mb-2">When's their birthday?</h2>
          <p className="text-charcoal-500 dark:text-charcoal-300 mb-5 text-sm">
            Optional. We'll give you a gentle heads-up 14, 7, 3, and 0 days before.
          </p>
          <input type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)}
            className="w-full rounded-journal border border-cream-200 dark:border-charcoal-700
                       bg-ivory-50 dark:bg-charcoal-800 px-3 py-2 outline-none mb-6" />
          <div className="flex gap-3">
            <button onClick={() => void saveFirstBirthday()}
              disabled={busy || !birthday} className="btn-primary">Save</button>
            <button onClick={() => setStep(4)} disabled={busy} className="btn-ghost">
              Do this later
            </button>
          </div>
        </Card>
      )}

      {step === 4 && (
        <Card>
          <h2 className="text-3xl mb-2">You're ready.</h2>
          <p className="text-charcoal-500 dark:text-charcoal-300 mb-6">
            Tip: press <kbd className="chip">⌘K</kbd> anywhere to jump, add a person, or
            ask the advisor.
          </p>
          <div className="flex gap-3">
            <button onClick={() => void finish(true)} disabled={busy} className="btn-primary">
              Open {firstName(name) || 'their profile'}
            </button>
            <button onClick={() => void finish()} disabled={busy} className="btn-ghost">
              Back to home
            </button>
          </div>
        </Card>
      )}
    </section>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="card-journal p-7">{children}</div>;
}

// Trim + collapse runs of whitespace, then take the first token. The
// previous `name.split(' ')[0]` returned an empty string for inputs like
// `"  Alex"` (leading whitespace) or `"Alex\tChen"` (a tab), which then
// led to labels rendering as just `'s birthday`.
function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? '';
}

function Progress({ step }: { step: number }) {
  return (
    <div className="mb-6 flex items-center gap-2">
      {[1, 2, 3, 4].map((i) => (
        <span key={i}
          className={[
            'h-1 flex-1 rounded-full transition-colors',
            i <= step ? 'bg-terracotta-500' : 'bg-cream-200 dark:bg-charcoal-700',
          ].join(' ')} />
      ))}
    </div>
  );
}
