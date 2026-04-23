// Mobile shell — top app bar + full-width content + bottom tab bar.
// "More" tab opens a slide-up drawer with the remaining nav items.
//
// The design avoids nested horizontal scrolling and puts the thumb-reachable
// controls (tabs, search) at the bottom. Uses the same CommandPaletteTrigger
// and NotificationBell as desktop so muscle memory carries across modes.

import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import AppSwitcher from '@/features/notifications/AppSwitcher';
import NotificationBell from '@/features/notifications/NotificationBell';
import CommandPaletteTrigger from '@/components/CommandPaletteTrigger';
import { NAV_ITEMS, type NavItem } from './nav';

const PRIMARY: NavItem[] = NAV_ITEMS.filter((n) => n.primary);
const SECONDARY: NavItem[] = NAV_ITEMS.filter((n) => !n.primary);

export default function MobileShell() {
  const { logout, user } = useAuthStore();
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

  // Close the More drawer on navigation.
  useEffect(() => { setMoreOpen(false); }, [location.pathname]);

  return (
    <div className="min-h-full flex flex-col">
      <header className="flex items-center justify-between gap-2 px-4 py-3
                         border-b border-cream-200 bg-cream-50/60 sticky top-0 z-10
                         backdrop-blur dark:border-charcoal-700 dark:bg-charcoal-950/70">
        <AppSwitcher />
        <div className="flex items-center gap-2">
          <CommandPaletteTrigger />
          <NotificationBell />
        </div>
      </header>

      <main className="flex-1 px-4 py-6 pb-24 max-w-2xl w-full mx-auto">
        <Outlet />
      </main>

      {/* Bottom tab bar */}
      <nav
        aria-label="Primary navigation"
        className="fixed bottom-0 inset-x-0 z-20 border-t border-cream-200
                   bg-cream-50/95 backdrop-blur
                   dark:border-charcoal-700 dark:bg-charcoal-950/95
                   pb-[env(safe-area-inset-bottom)]"
      >
        <ul className="grid grid-cols-5">
          {PRIMARY.map((it) => (
            <li key={it.to}>
              <NavLink
                to={it.to}
                end={it.exact}
                className={({ isActive }) =>
                  [
                    'flex flex-col items-center justify-center gap-0.5 py-2 text-[11px]',
                    'transition-colors',
                    isActive
                      ? 'text-terracotta-600 dark:text-terracotta-300'
                      : 'text-charcoal-500 dark:text-charcoal-300',
                  ].join(' ')
                }
              >
                <span className="text-lg leading-none" aria-hidden>{it.icon}</span>
                <span>{it.label}</span>
              </NavLink>
            </li>
          ))}
          <li>
            <button
              onClick={() => setMoreOpen(true)}
              className="w-full flex flex-col items-center justify-center gap-0.5
                         py-2 text-[11px] text-charcoal-500 dark:text-charcoal-300"
              aria-label="More"
            >
              <span className="text-lg leading-none" aria-hidden>⋯</span>
              <span>More</span>
            </button>
          </li>
        </ul>
      </nav>

      {moreOpen && (
        <MoreDrawer
          onClose={() => setMoreOpen(false)}
          email={user?.email ?? null}
          onSignOut={() => { void logout(); }}
        />
      )}
    </div>
  );
}

function MoreDrawer(props: { onClose: () => void; email: string | null; onSignOut: () => void }) {
  return (
    <div className="fixed inset-0 z-30 flex items-end sm:items-center sm:justify-center
                    bg-charcoal-900/40 backdrop-blur-sm dark:bg-charcoal-950/70"
         onClick={props.onClose} role="dialog" aria-modal="true">
      <div onClick={(e) => e.stopPropagation()}
           className="w-full sm:max-w-sm card-journal p-0 rounded-t-journal sm:rounded-journal
                      animate-bloom overflow-hidden">
        <div className="px-4 py-3 border-b border-cream-200 dark:border-charcoal-700 flex items-center justify-between">
          <span className="text-xs uppercase tracking-wider text-charcoal-500 dark:text-charcoal-300">
            More
          </span>
          <button onClick={props.onClose} className="btn-ghost text-xs py-1">Close</button>
        </div>
        <ul className="py-2 max-h-[60vh] overflow-y-auto">
          {SECONDARY.map((it) => (
            <li key={it.to}>
              <NavLink to={it.to}
                className={({ isActive }) =>
                  [
                    'flex items-center gap-3 px-4 py-3 text-sm transition-colors',
                    isActive
                      ? 'bg-cream-100 text-terracotta-600 dark:bg-charcoal-700 dark:text-terracotta-300'
                      : 'text-charcoal-700 dark:text-cream-100 hover:bg-cream-50 dark:hover:bg-charcoal-800',
                  ].join(' ')
                }>
                <span className="text-lg w-6 text-center" aria-hidden>{it.icon}</span>
                {it.label}
              </NavLink>
            </li>
          ))}
        </ul>
        <div className="px-4 py-3 border-t border-cream-200 dark:border-charcoal-700
                        text-xs text-charcoal-500 dark:text-charcoal-300
                        flex items-center justify-between gap-3">
          <span className="truncate">{props.email}</span>
          <button onClick={props.onSignOut} className="btn-ghost text-xs py-1">Sign out</button>
        </div>
      </div>
    </div>
  );
}
