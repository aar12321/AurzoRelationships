// Apps hub — the second of the three mobile bottom-tabs. Shows every
// in-platform surface as a card with a one-line description so a phone
// user can reach People / Dates / Gifts / Memories / Advisor / etc.
// without a hidden "More" drawer. Renders cleanly on desktop too if a
// user happens to land on /relationships/apps directly, but the desktop
// shell never links here (the sidebar covers that need).

import { Link } from 'react-router-dom';
import { APP_HUB_ITEMS } from '@/components/layout/nav';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export default function AppsHubPage() {
  useDocumentTitle('Apps');

  return (
    <section className="animate-bloom">
      <header className="mb-6">
        <h1 className="text-4xl">All your tools</h1>
        <p className="text-charcoal-500 dark:text-charcoal-300 mt-1">
          Everything in Aurzo Relationships, one tap away.
        </p>
      </header>

      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {APP_HUB_ITEMS.map((it) => (
          <li key={it.to}>
            <Link
              to={it.to}
              className="card-journal block hover:-translate-y-0.5 hover:shadow-warm-dark
                         transition-all p-4"
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl leading-none mt-0.5" aria-hidden>{it.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-serif text-lg text-charcoal-900 dark:text-cream-50">
                    {it.label}
                  </div>
                  {it.description && (
                    <p className="text-xs text-charcoal-600 dark:text-charcoal-300 mt-0.5 leading-snug">
                      {it.description}
                    </p>
                  )}
                </div>
                <span className="text-charcoal-400 dark:text-charcoal-500 text-sm shrink-0 mt-1"
                      aria-hidden>→</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
