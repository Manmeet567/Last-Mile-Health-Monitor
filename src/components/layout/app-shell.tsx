import type { PropsWithChildren } from 'react';
import { NavLink } from 'react-router-dom';
import { appConfig } from '@/app/config/app.config';
import { navigationItems } from '@/app/config/navigation';

const navLinkClassName = ({ isActive }: { isActive: boolean }) =>
  [
    'rounded-full px-4 py-2 text-sm font-medium transition',
    isActive
      ? 'bg-accent-400 text-slate-950 shadow-lg shadow-cyan-950/40'
      : 'text-slate-300 hover:bg-white/10 hover:text-white',
  ].join(' ');

export function AppShell({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="rounded-[2rem] border border-white/10 bg-slate-950/60 p-5 shadow-panel backdrop-blur">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent-300">
                Privacy-First Desk Health
              </p>
              <div>
                <h1 className="font-display text-2xl font-bold text-white">
                  {appConfig.shortName}
                </h1>
                <p className="max-w-2xl text-sm text-slate-300">{appConfig.description}</p>
              </div>
            </div>

            <nav className="flex flex-wrap gap-2" aria-label="Primary">
              {navigationItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={navLinkClassName}
                  end={item.to === '/'}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
        </header>

        <main className="flex-1 py-8">{children}</main>
      </div>
    </div>
  );
}
