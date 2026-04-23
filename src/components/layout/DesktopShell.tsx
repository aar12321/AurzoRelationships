import { NavLink, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import AppSwitcher from '@/features/notifications/AppSwitcher';
import NotificationBell from '@/features/notifications/NotificationBell';
import CommandPaletteTrigger from '@/components/CommandPaletteTrigger';
import { NAV_ITEMS } from './nav';

export default function DesktopShell() {
  const { logout, user } = useAuthStore();

  return (
    <div className="min-h-full flex flex-row">
      <aside
        className="w-60 min-h-screen border-r border-cream-200 bg-cream-100
                   sticky top-0 flex flex-col
                   dark:bg-charcoal-900 dark:border-charcoal-700"
      >
        <div className="px-3 py-5">
          <AppSwitcher />
        </div>

        <nav className="flex flex-col gap-1 px-3 pb-3 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              className={({ isActive }) =>
                [
                  'rounded-journal px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-terracotta-600 text-ivory-50 dark:bg-terracotta-500'
                    : 'text-charcoal-700 hover:bg-cream-200 dark:text-cream-100 dark:hover:bg-charcoal-800',
                ].join(' ')
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto px-5 py-4 text-xs text-charcoal-500 dark:text-charcoal-300">
          <div className="mb-2 truncate">{user?.email}</div>
          <button onClick={() => void logout()} className="btn-ghost w-full justify-start">
            Sign out
          </button>
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
