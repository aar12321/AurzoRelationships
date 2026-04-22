import { NavLink, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

const nav = [
  { to: '/relationships',          label: 'Home' },
  { to: '/relationships/people',   label: 'People' },
  { to: '/relationships/dates',    label: 'Dates' },
  { to: '/relationships/health',   label: 'Health' },
  { to: '/relationships/events',   label: 'Events' },
  { to: '/relationships/gifts',    label: 'Gifts' },
  { to: '/relationships/memories', label: 'Memories' },
  { to: '/relationships/couples',  label: 'Couples' },
  { to: '/relationships/advisor',  label: 'Advisor' },
  { to: '/relationships/settings', label: 'Settings' },
];

export default function AppShell() {
  const { logout, user } = useAuthStore();

  return (
    <div className="min-h-full flex flex-col md:flex-row">
      <aside
        className="md:w-60 md:min-h-screen md:border-r border-cream-200
                   bg-cream-100 md:sticky md:top-0"
      >
        <div className="px-5 py-6">
          <div className="font-serif text-2xl text-charcoal-900">Aurzo</div>
          <div className="text-xs text-charcoal-500">Relationship OS</div>
        </div>

        <nav
          className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible
                     px-3 pb-3"
        >
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/relationships'}
              className={({ isActive }) =>
                [
                  'whitespace-nowrap rounded-journal px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-terracotta-600 text-ivory-50'
                    : 'text-charcoal-700 hover:bg-cream-200',
                ].join(' ')
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden md:block mt-auto px-5 py-4 text-xs text-charcoal-500">
          <div className="mb-2 truncate">{user?.email}</div>
          <button onClick={() => void logout()} className="btn-ghost w-full justify-start">
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 px-5 md:px-10 py-8 max-w-5xl w-full mx-auto">
        <Outlet />
      </main>
    </div>
  );
}
