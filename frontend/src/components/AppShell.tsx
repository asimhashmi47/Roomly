import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CalendarDays,
  DoorOpen,
  LayoutDashboard,
  LogOut,
  ScrollText,
  Server,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import type { Role } from '../lib/types';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  roles: Role[];
  end?: boolean;
}

const NAV: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['ADMIN'], end: true },
  { to: '/rooms', label: 'Rooms', icon: DoorOpen, roles: ['ADMIN', 'USER'] },
  { to: '/users', label: 'Users', icon: Users, roles: ['ADMIN'] },
  { to: '/audit-logs', label: 'Audit logs', icon: ScrollText, roles: ['ADMIN'] },
  { to: '/system-logs', label: 'System logs', icon: Server, roles: ['ADMIN'] },
];

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="grid size-8 place-items-center rounded-lg bg-primary text-white shadow-card">
        <CalendarDays className="size-[18px]" aria-hidden />
      </div>
      <span className="text-[15px] font-semibold tracking-tight">Roomly</span>
    </div>
  );
}

export function AppShell() {
  const { user, logout } = useAuth();
  const location = useLocation();
  if (!user) return null;
  const items = NAV.filter((n) => n.roles.includes(user.role));
  const initials = user.name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[15rem_1fr]">
      <aside className="border-b border-line bg-surface md:sticky md:top-0 md:h-dvh md:border-r md:border-b-0">
        <div className="flex h-full flex-col gap-4 p-3 md:p-4">
          <div className="flex items-center justify-between md:block md:px-2 md:py-2">
            <Brand />
            <button
              onClick={logout}
              aria-label="Sign out"
              className="grid size-8 place-items-center rounded-lg text-muted hover:bg-sunken hover:text-ink md:hidden"
            >
              <LogOut className="size-4" />
            </button>
          </div>

          <nav aria-label="Main" className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
            {items.map(({ to, label, icon: Icon, end }) => {
              const active = end ? location.pathname === to : location.pathname.startsWith(to);
              return (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={`relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors duration-150 ${
                    active ? 'text-primary-ink' : 'text-ink-2 hover:bg-sunken hover:text-ink'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-active"
                      className="absolute inset-0 rounded-lg bg-primary-soft"
                      transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                    />
                  )}
                  <Icon className="relative size-4" aria-hidden />
                  <span className="relative">{label}</span>
                </NavLink>
              );
            })}
          </nav>

          <div className="mt-auto hidden items-center gap-3 rounded-xl border border-line p-2.5 md:flex">
            <div
              aria-hidden
              className="grid size-9 shrink-0 place-items-center rounded-full bg-accent-soft text-[13px] font-semibold text-accent-ink"
            >
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="text-xs text-muted">{user.role === 'ADMIN' ? 'Administrator' : 'Member'}</p>
            </div>
            <button
              onClick={logout}
              aria-label="Sign out"
              className="grid size-8 place-items-center rounded-lg text-muted transition-colors hover:bg-sunken hover:text-ink"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </aside>

      <main className="min-w-0 px-4 py-6 sm:px-8 sm:py-8">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
