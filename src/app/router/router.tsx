import { Suspense, lazy } from 'react';
import { createBrowserRouter, Outlet, RouterProvider } from 'react-router-dom';
import { AppShell } from '@/components/layout/app-shell';

const DashboardPage = lazy(async () => {
  const module = await import('@/pages/dashboard/dashboard-page');
  return { default: module.DashboardPage };
});

const LiveMonitorPage = lazy(async () => {
  const module = await import('@/pages/live-monitor/live-monitor-page');
  return { default: module.LiveMonitorPage };
});

const OnboardingPage = lazy(async () => {
  const module = await import('@/pages/onboarding/onboarding-page');
  return { default: module.OnboardingPage };
});

const HistoryPage = lazy(async () => {
  const module = await import('@/pages/history/history-page');
  return { default: module.HistoryPage };
});

const SettingsPage = lazy(async () => {
  const module = await import('@/pages/settings/settings-page');
  return { default: module.SettingsPage };
});

const PrivacyPage = lazy(async () => {
  const module = await import('@/pages/privacy/privacy-page');
  return { default: module.PrivacyPage };
});

const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <AppShell>
        <Suspense fallback={<RouteLoadingFallback />}>
          <Outlet />
        </Suspense>
      </AppShell>
    ),
    children: [
      {
        index: true,
        element: <DashboardPage />,
      },
      {
        path: 'live-monitor',
        element: <LiveMonitorPage />,
      },
      {
        path: 'onboarding',
        element: <OnboardingPage />,
      },
      {
        path: 'history',
        element: <HistoryPage />,
      },
      {
        path: 'settings',
        element: <SettingsPage />,
      },
      {
        path: 'privacy',
        element: <PrivacyPage />,
      },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}

function RouteLoadingFallback() {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-panel backdrop-blur">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent-300">Loading</p>
      <h1 className="mt-3 font-display text-2xl text-white">Preparing the next screen</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
        The app is loading the route-specific code for this part of the experience.
      </p>
    </section>
  );
}
