// 404 — renders outside AppShell, so no nav chrome; needs to be self-contained.
// Warm framing: "this page wandered off" beats "404 not found" every time.

import { Link, useLocation } from 'react-router-dom';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export default function NotFoundPage() {
  useDocumentTitle('Not found');
  const location = useLocation();

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-16
                     bg-ivory-50 dark:bg-charcoal-950
                     text-charcoal-900 dark:text-cream-50">
      <div className="w-full max-w-xl card-journal animate-bloom">
        <div className="text-4xl mb-3" aria-hidden>🌫️</div>
        <h1 className="text-4xl mb-2 font-serif">This page wandered off.</h1>
        <p className="text-charcoal-500 dark:text-charcoal-300 mb-6">
          We couldn't find{' '}
          <code className="font-mono text-[0.85em] px-1.5 py-0.5 rounded
                          bg-cream-100 dark:bg-charcoal-800 break-all">
            {location.pathname}
          </code>
          {'. '}
          Let's get you somewhere useful.
        </p>

        <div className="flex flex-wrap gap-2">
          <Link to="/relationships" className="btn-primary">
            Back to home
          </Link>
          <Link to="/relationships/today"
                className="btn-ghost border border-cream-200 dark:border-charcoal-700">
            Today's feed
          </Link>
          <Link to="/relationships/people"
                className="btn-ghost border border-cream-200 dark:border-charcoal-700">
            People
          </Link>
        </div>

        <p className="text-xs text-charcoal-500 dark:text-charcoal-300 mt-8">
          Tip: press <kbd className="px-1.5 py-0.5 rounded bg-cream-100
                                     dark:bg-charcoal-800 text-[11px] font-mono">⌘K</kbd>
          {' '}anywhere in Aurzo to jump to any page.
        </p>
      </div>
    </main>
  );
}
