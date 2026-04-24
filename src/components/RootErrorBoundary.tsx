// Last line of defense. React will unmount a tree on an uncaught render or
// commit error, which in this app means a blank white screen. Catching here
// keeps the warm Aurzo shell visible, lets the user retry without losing
// their auth session, and logs the component stack so bugs are debuggable.
//
// Must be a class component — React error boundaries don't have a hook
// equivalent in React 18.

import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { error: Error | null; info: ErrorInfo | null };

export default class RootErrorBoundary extends Component<Props, State> {
  state: State = { error: null, info: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('[aurzo] Uncaught render error:', error, info.componentStack);
    document.title = 'Something came loose · Aurzo';
    this.setState({ info });
  }

  private reset = () => {
    // Returning to a pristine state lets the children re-mount. If the fault
    // is deterministic the boundary will just re-trigger, but for transient
    // errors (stale fetch, a bad prop after nav) this usually recovers.
    this.setState({ error: null, info: null });
  };

  private reload = () => {
    window.location.reload();
  };

  render() {
    const { error, info } = this.state;
    if (!error) return this.props.children;

    return (
      <main
        role="alert"
        aria-live="assertive"
        className="min-h-screen flex items-center justify-center px-6 py-16
                   bg-ivory-50 dark:bg-charcoal-950
                   text-charcoal-900 dark:text-cream-50"
      >
        <div className="w-full max-w-xl card-journal animate-bloom">
          <div className="text-3xl mb-2" aria-hidden>🌾</div>
          <h1 className="text-3xl mb-2">Something came loose.</h1>
          <p className="text-charcoal-500 dark:text-charcoal-300 mb-5">
            A small part of Aurzo hit an unexpected snag while drawing this
            screen. Your people, memories, and messages are safe — we just
            couldn't finish painting this view.
          </p>

          <div className="flex flex-wrap gap-3 mb-6">
            <button onClick={this.reset} className="btn-primary">
              Try again
            </button>
            <button
              onClick={this.reload}
              className="btn-ghost border border-cream-200 dark:border-charcoal-700"
            >
              Reload the app
            </button>
            <a
              href="/relationships"
              className="btn-ghost text-sm self-center ml-auto"
            >
              Go home
            </a>
          </div>

          <details open={import.meta.env.DEV}
                   className="text-xs text-charcoal-500 dark:text-charcoal-300">
            <summary className="cursor-pointer select-none hover:text-terracotta-600
                               dark:hover:text-terracotta-300">
              Technical details
            </summary>
            <pre className="mt-3 p-3 rounded-journal
                            bg-cream-50 dark:bg-charcoal-900
                            border border-cream-200 dark:border-charcoal-800
                            overflow-auto max-h-64 font-mono text-[11px]
                            whitespace-pre-wrap break-words">
              {error.name}: {error.message}
              {error.stack ? '\n\n' + error.stack : ''}
              {info?.componentStack ? '\n\nComponent stack:' + info.componentStack : ''}
            </pre>
          </details>
        </div>
      </main>
    );
  }
}
