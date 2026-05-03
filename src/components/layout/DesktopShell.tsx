import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthProvider';
import NotificationBell from '@/features/notifications/NotificationBell';
import CommandPaletteTrigger from '@/components/CommandPaletteTrigger';
import ConfirmModal from '@/components/ConfirmModal';
import { DESKTOP_NAV } from './nav';

export default function DesktopShell() {
  const { signOut, user } = useAuth();
  const [confirmOut, setConfirmOut] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  return (
    <div className="min-h-full flex flex-row">
      <aside
        className="w-60 min-h-screen border-r border-cream-200 bg-cream-100
                   sticky top-0 flex flex-col
                   dark:bg-charcoal-900 dark:border-charcoal-700"
      >
        <div className="px-5 pt-5 pb-3 flex items-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl
                           bg-terracotta-500 text-ivory-50 font-serif text-lg shadow-sm">
            A
          </span>
          <div>
            <div className="font-serif text-base text-charcoal-900 dark:text-cream-50 leading-none">
              Aurzo
            </div>
            <div className="text-[10px] uppercase tracking-wider text-charcoal-500 dark:text-charcoal-300 mt-0.5">
              Relationships
            </div>
          </div>
        </div>

        <nav className="flex flex-col gap-1 px-3 pb-3 overflow-y-auto">
          {DESKTOP_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              data-tour={`nav:${item.to}`}
              title={item.description}
              className={({ isActive }) =>
                [
                  'flex items-center gap-2 rounded-journal px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-terracotta-600 text-ivory-50 dark:bg-terracotta-500'
                    : 'text-charcoal-700 hover:bg-cream-200 dark:text-cream-100 dark:hover:bg-charcoal-800',
                ].join(' ')
              }
            >
              <span className="text-base leading-none w-5 text-center" aria-hidden>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto px-5 py-4 text-xs text-charcoal-500 dark:text-charcoal-300">
          <div className="mb-2 truncate">{user?.email}</div>
          <button onClick={() => setConfirmOut(true)} className="btn-ghost w-full justify-start">
            Sign out
          </button>

          <ConfirmModal
            open={confirmOut}
            title="Sign out of Aurzo?"
            description="You'll need to sign back in to see your people, dates, and memories."
            confirmLabel="Sign out"
            cancelLabel="Stay"
            busy={signingOut}
            onCancel={() => setConfirmOut(false)}
            onConfirm={async () => {
              setSigningOut(true);
              try { await signOut(); } finally { setSigningOut(false); setConfirmOut(false); }
            }}
          />
        </div>
      </aside>

      <div className="flex-1 flex flex-col">
        <header className="flex justify-end items-center gap-3 px-10 py-3
                           border-b border-cream-200 bg-cream-50/60
                           sticky top-0 z-10 backdrop-blur
                           dark:border-charcoal-700 dark:bg-charcoal-950/70">
          <CommandPaletteTrigger />
          <NotificationBell />
        </header>
        <main className="flex-1 px-10 py-8 max-w-5xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
