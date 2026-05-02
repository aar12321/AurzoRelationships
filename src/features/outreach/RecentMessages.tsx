// Last 5 outreach messages for a person, shown below the composer so the
// user can see the rhythm of their reach-outs without leaving the page.

import {
  CHANNEL_LABELS, OCCASION_LABELS,
  type OutreachMessage,
} from '@/types/outreach';

type Props = { messages: OutreachMessage[] };

export default function RecentMessages({ messages }: Props) {
  if (messages.length === 0) return null;
  return (
    <section aria-labelledby="recent-msgs" className="mt-8">
      <h2 id="recent-msgs"
          className="text-xs uppercase tracking-wider text-charcoal-500 mb-2">
        Recent reach-outs
      </h2>
      <ul className="space-y-2">
        {messages.map((m) => (
          <li key={m.id} className="card-journal text-sm">
            <div className="flex items-baseline justify-between gap-3 mb-1">
              <span className="font-medium text-charcoal-700">
                {OCCASION_LABELS[m.occasion]} · {CHANNEL_LABELS[m.channel]}
              </span>
              <span className="text-xs text-charcoal-500 shrink-0">
                {relativeDay(m.sent_at ?? m.created_at)}
              </span>
            </div>
            <p className="text-charcoal-700 line-clamp-2 whitespace-pre-wrap">
              {m.body}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function relativeDay(iso: string): string {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (d <= 0) return 'today';
  if (d === 1) return 'yesterday';
  if (d < 7)   return `${d}d ago`;
  if (d < 60)  return `${Math.floor(d / 7)}w ago`;
  return `${Math.floor(d / 30)}mo ago`;
}
