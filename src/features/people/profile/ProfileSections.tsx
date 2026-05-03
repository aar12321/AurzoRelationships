import type { Person } from '@/types/people';
import {
  COMMUNICATION_PREF_LABELS,
  RELATIONSHIP_GOAL_LABELS,
} from '@/types/people';

function Section({
  title, children,
}: { title: string; empty?: string; children?: React.ReactNode }) {
  // Empty sections collapse — previously every blank card rendered
  // placeholder copy, which the latest walkthrough flagged as "empty
  // squares". The Edit screen is where to fill them in; here we only
  // show what the user has actually captured.
  if (!children) return null;
  return (
    <section className="card-journal">
      <h2 className="font-serif text-xl text-charcoal-900 dark:text-cream-50 mb-2">{title}</h2>
      <div className="text-charcoal-700 dark:text-cream-100 whitespace-pre-wrap">{children}</div>
    </section>
  );
}

export function NotesSection({ person }: { person: Person }) {
  return (
    <Section
      title="Notes"
      empty="What do you want to remember about them? Personality, things they love, things to avoid."
    >
      {person.notes || undefined}
    </Section>
  );
}

export function StorySection({ person }: { person: Person }) {
  const parts = [
    person.how_we_met && `How you met: ${person.how_we_met}`,
    person.met_on && `Since ${new Date(person.met_on).getFullYear()}`,
  ].filter(Boolean) as string[];
  return (
    <Section
      title="Your story"
      empty="A line about how you met can anchor the rest — add one when you're ready."
    >
      {parts.length > 0 ? parts.join(' · ') : undefined}
    </Section>
  );
}

export function LifeContextSection({ person }: { person: Person }) {
  const ctx = person.life_context ?? {};
  // life_context is a jsonb column with no schema enforcement — older
  // rows may contain numbers, booleans, even nulls in these slots. React
  // throws if you try to render anything but strings/numbers as a child,
  // so coerce defensively here rather than crashing the whole profile.
  const rows = [
    ctx.job && ['Work', String(ctx.job)],
    ctx.relationship_status && ['Relationship', String(ctx.relationship_status)],
    ctx.kids && ['Family', String(ctx.kids)],
    ctx.major_events && ['Recent events', String(ctx.major_events)],
  ].filter(Boolean) as [string, string][];
  return (
    <Section
      title="Life context"
      empty="Job, family, recent events — the fabric of their life right now."
    >
      {rows.length > 0 ? (
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-charcoal-500">{k}</dt>
              <dd className="text-charcoal-700">{v}</dd>
            </div>
          ))}
        </dl>
      ) : undefined}
    </Section>
  );
}

export function PreferencesSection({ person }: { person: Person }) {
  const rows = [
    person.relationship_goal && [
      'Your goal', RELATIONSHIP_GOAL_LABELS[person.relationship_goal],
    ],
    person.communication_pref && [
      'They prefer', COMMUNICATION_PREF_LABELS[person.communication_pref],
    ],
    person.fading_threshold_days && [
      'Ping me after', `${person.fading_threshold_days} days`,
    ],
  ].filter(Boolean) as [string, string][];
  return (
    <Section
      title="How you show up"
      empty="Your intention here shapes every nudge — maintain, deepen, or reconnect."
    >
      {rows.length > 0 ? (
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-charcoal-500">{k}</dt>
              <dd className="text-charcoal-700">{v}</dd>
            </div>
          ))}
        </dl>
      ) : undefined}
    </Section>
  );
}

export function CustomFieldsSection({ person }: { person: Person }) {
  const fields = person.custom_fields ?? [];
  return (
    <Section
      title="Small things"
      empty={'"Hates surprises." "Allergic to shellfish." The tiny details that matter.'}
    >
      {fields.length > 0 ? (
        <ul className="space-y-1 text-sm">
          {fields.map((f, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-charcoal-500 min-w-32">{f.label}</span>
              <span className="text-charcoal-700">{f.value}</span>
            </li>
          ))}
        </ul>
      ) : undefined}
    </Section>
  );
}
