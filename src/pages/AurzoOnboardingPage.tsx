import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  completeOnboarding,
  saveOnboardingStep,
  startOnboarding,
} from '@/services/aurzo/auth';
import { PLATFORM_LABEL, PLATFORM_TAGLINE } from '@/services/aurzo/config';

type PrimaryRelationship = 'partner' | 'family' | 'friends' | 'dating';
type WhatMatters = 'communication' | 'quality time' | 'rituals' | 'memory';

type Prefs = {
  primary?: PrimaryRelationship;
  matters?: WhatMatters;
};

const PREFS_KEY = 'aurzo.relationships.prefs';

const RELATIONSHIP_OPTIONS: { value: PrimaryRelationship; label: string; hint: string }[] = [
  { value: 'partner', label: 'Partner', hint: 'Deepening one primary relationship' },
  { value: 'family', label: 'Family', hint: 'Parents, siblings, children' },
  { value: 'friends', label: 'Friends', hint: 'The chosen family' },
  { value: 'dating', label: 'Dating', hint: 'Meeting someone new' },
];

const MATTERS_OPTIONS: { value: WhatMatters; label: string; hint: string }[] = [
  { value: 'communication', label: 'Communication', hint: 'Saying the right thing at the right time' },
  { value: 'quality time', label: 'Quality time', hint: 'Presence over presents' },
  { value: 'rituals', label: 'Rituals', hint: 'Small repeated acts of love' },
  { value: 'memory', label: 'Memory', hint: 'Never forgetting the moments' },
];

export default function AurzoOnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [prefs, setPrefs] = useState<Prefs>(() => {
    if (typeof window === 'undefined') return {};
    try {
      return JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') as Prefs;
    } catch {
      return {};
    }
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void startOnboarding();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    }
  }, [prefs]);

  const canContinue = useMemo(() => {
    if (step === 0) return true;
    if (step === 1) return Boolean(prefs.primary && prefs.matters);
    return true;
  }, [step, prefs]);

  async function handleNext() {
    if (step === 0) {
      await saveOnboardingStep('welcome', {});
      setStep(1);
    } else if (step === 1) {
      await saveOnboardingStep('preferences', { ...prefs });
      setStep(2);
    } else {
      setBusy(true);
      await saveOnboardingStep('complete', { ...prefs });
      await completeOnboarding();
      setBusy(false);
      navigate('/relationships', { replace: true });
    }
  }

  return (
    <main className="min-h-screen bg-ivory-50 text-charcoal-900 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-xl">
        <div className="mb-8">
          <div className="text-xs uppercase tracking-[0.2em] text-charcoal-500">Aurzo</div>
          <h1 className="mt-2 text-3xl font-serif">{PLATFORM_LABEL}</h1>
          <p className="text-charcoal-500">{PLATFORM_TAGLINE}</p>
        </div>

        <div className="rounded-journal border border-cream-200 bg-white p-8 shadow-sm">
          <StepIndicator step={step} />

          {step === 0 && <WelcomeStep />}
          {step === 1 && (
            <PreferencesStep
              prefs={prefs}
              onChange={(patch) => setPrefs((p) => ({ ...p, ...patch }))}
            />
          )}
          {step === 2 && <CompleteStep prefs={prefs} />}

          <div className="mt-8 flex items-center justify-between">
            <button
              type="button"
              onClick={() => step > 0 && setStep((step - 1) as 0 | 1 | 2)}
              disabled={step === 0 || busy}
              className="text-sm text-charcoal-500 hover:text-charcoal-900 disabled:opacity-40"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleNext}
              disabled={!canContinue || busy}
              className="rounded-journal bg-terracotta-700 hover:bg-terracotta-800 disabled:opacity-60 text-cream-50 px-5 py-2.5 font-medium"
            >
              {step === 2 ? (busy ? 'Finishing…' : 'Enter Relationship OS') : 'Continue'}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

function StepIndicator({ step }: { step: 0 | 1 | 2 }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={`h-1.5 flex-1 rounded-full ${
            i <= step ? 'bg-terracotta-700' : 'bg-cream-200'
          }`}
        />
      ))}
    </div>
  );
}

function WelcomeStep() {
  return (
    <div>
      <h2 className="text-2xl font-serif mb-2">A quiet place for the people who matter.</h2>
      <p className="text-charcoal-500">
        Relationship OS helps you remember what matters, show up on time, and
        keep the little things from slipping. Let's take a minute to tune it
        to you.
      </p>
    </div>
  );
}

function PreferencesStep({
  prefs,
  onChange,
}: {
  prefs: Prefs;
  onChange: (patch: Partial<Prefs>) => void;
}) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-serif mb-3">Primary relationship?</h2>
        <div className="grid grid-cols-2 gap-3">
          {RELATIONSHIP_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange({ primary: opt.value })}
              className={`rounded-journal border px-4 py-3 text-left transition ${
                prefs.primary === opt.value
                  ? 'border-terracotta-700 bg-terracotta-50 ring-1 ring-terracotta-500'
                  : 'border-cream-200 bg-white hover:border-terracotta-300'
              }`}
            >
              <div className="font-medium">{opt.label}</div>
              <div className="text-xs text-charcoal-500 mt-0.5">{opt.hint}</div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-xl font-serif mb-3">What matters most?</h2>
        <div className="grid grid-cols-2 gap-3">
          {MATTERS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange({ matters: opt.value })}
              className={`rounded-journal border px-4 py-3 text-left transition ${
                prefs.matters === opt.value
                  ? 'border-terracotta-700 bg-terracotta-50 ring-1 ring-terracotta-500'
                  : 'border-cream-200 bg-white hover:border-terracotta-300'
              }`}
            >
              <div className="font-medium capitalize">{opt.label}</div>
              <div className="text-xs text-charcoal-500 mt-0.5">{opt.hint}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function CompleteStep({ prefs }: { prefs: Prefs }) {
  return (
    <div>
      <h2 className="text-2xl font-serif mb-2">You're all set.</h2>
      <p className="text-charcoal-500 mb-4">
        We'll tune Relationship OS around{' '}
        <span className="font-medium capitalize text-charcoal-900">
          {prefs.primary ?? 'your people'}
        </span>{' '}
        and a focus on{' '}
        <span className="font-medium text-charcoal-900">
          {prefs.matters ?? 'what matters most'}
        </span>
        .
      </p>
      <p className="text-sm text-charcoal-500">
        You can refine these anytime from Settings.
      </p>
    </div>
  );
}
