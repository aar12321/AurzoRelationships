// Mobile shell — three bottom-tabs (Home, Apps, Profile) per product
// spec. The "Apps" tab opens an in-platform hub page (/relationships/apps)
// listing every other surface as a card so a phone user can still reach
// People / Dates / Gifts / Memories / Advisor / etc. without a hidden
// "More" drawer or a cross-platform app switcher.

import { NavLink, Outlet } from 'react-router-dom';
import NotificationBell from '@/features/notifications/NotificationBell';
import CommandPaletteTrigger from '@/components/CommandPaletteTrigger';
import { MOBILE_NAV } from './nav';

export default function MobileShell() {
  return (
    <div className="min-h-full flex flex-col">
      <header className="flex items-center justify-between gap-2 px-4 py-3
                         border-b border-cream-200 bg-cream-50/60 sticky top-0 z-10
                         backdrop-blur dark:border-charcoal-700 dark:bg-charcoal-950/70">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg
                           bg-terracotta-500 text-ivory-50 font-serif text-sm shadow-sm">
            A
          </span>
          <span className="font-serif text-base text-charcoal-900 dark:text-cream-50">
            Aurzo Relationships
          </span>
        </div>
        <div className="flex items-center gap-2">
          <CommandPaletteTrigger />
          <NotificationBell />
        </div>
      </header>

      <main className="flex-1 px-4 py-6 pb-24 max-w-2xl w-full mx-auto">
        <Outlet />
      </main>

      <nav
        aria-label="Primary navigation"
        className="fixed bottom-0 inset-x-0 z-20 border-t border-cream-200
                   bg-cream-50/95 backdrop-blur
                   dark:border-charcoal-700 dark:bg-charcoal-950/95
                   pb-[env(safe-area-inset-bottom)]"
      >
        <ul className="grid grid-cols-3">
          {MOBILE_NAV.map((it) => (
            <li key={it.to}>
              <NavLink
                to={it.to}
                end={it.exact}
                data-tour={`nav:${it.to}`}
                className={({ isActive }) =>
                  [
                    'flex flex-col items-center justify-center gap-0.5 py-2.5 text-[11px]',
                    'transition-colors',
                    isActive
                      ? 'text-terracotta-600 dark:text-terracotta-300'
                      : 'text-charcoal-500 dark:text-charcoal-300',
                  ].join(' ')
                }
              >
                <span className="text-xl leading-none" aria-hidden>{it.icon}</span>
                <span>{it.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
