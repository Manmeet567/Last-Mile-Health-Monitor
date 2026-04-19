import type { PropsWithChildren } from 'react';
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { appConfig } from '@/app/config/app.config';
import { AppSidebar, MobileBottomNav } from '@/components/layout/app-sidebar';

export function AppShell({ children }: PropsWithChildren) {
  const location = useLocation();
  const [isRouteChanging, setIsRouteChanging] = useState(false);
  const [isRouteVisible, setIsRouteVisible] = useState(false);

  useEffect(() => {
    setIsRouteChanging(true);
    setIsRouteVisible(false);

    const frame = window.requestAnimationFrame(() => {
      setIsRouteVisible(true);
    });
    const timer = window.setTimeout(() => {
      setIsRouteChanging(false);
    }, 280);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [location.pathname, location.search]);

  return (
    <div className="min-h-screen bg-[#0B1020] text-[#EAF2FF]">
      <AppSidebar />

      <div className="flex min-h-screen min-w-0 flex-1 flex-col pb-24 md:pb-0 md:pl-[232px]">
        <header className="border-b border-white/8 bg-[#0B1020]/92 px-4 py-4 backdrop-blur md:hidden">
          <div className="flex items-center justify-between gap-4">
            <Link to="/" className="block">
              <p className="text-lg font-semibold tracking-[-0.03em] text-[#EAF2FF]">
                {appConfig.shortName}
              </p>
              <p className="text-sm text-[#8FA4C8]">Desk Health</p>
            </Link>
            <div className="rounded-full border border-[#5BC0FF]/20 bg-[#13213D] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5BC0FF]">
              Local only
            </div>
          </div>
        </header>

        <main className="app-scroll flex-1 overflow-y-auto">
          <div className="relative mx-auto w-full max-w-[1248px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
            <div
              className={[
                'route-progress rounded-full',
                isRouteChanging ? 'route-progress--active' : '',
              ].join(' ')}
            />
            <div
              key={`${location.pathname}${location.search}`}
              className={[
                'route-scene',
                isRouteVisible ? 'route-scene--visible' : '',
              ].join(' ')}
            >
              {children}
            </div>
          </div>
        </main>
      </div>

      <MobileBottomNav />
    </div>
  );
}
