import { Suspense, lazy } from 'react';
import {
  createBrowserRouter,
  Navigate,
  Outlet,
  RouterProvider,
} from 'react-router-dom';
import { AppShell } from '@/components/layout/app-shell';
import { PageLoader } from '@/components/ui/page-loader';

const OverviewPage = lazy(async () => {
  const module = await import('@/pages/overview/overview-page');
  return { default: module.OverviewPage };
});

const DashboardPage = lazy(async () => {
  const module = await import('@/pages/dashboard/dashboard-page');
  return { default: module.DashboardPage };
});

const LiveMonitorPage = lazy(async () => {
  const module = await import('@/pages/live-monitor/live-monitor-page');
  return { default: module.LiveMonitorPage };
});

const SymptomCheckInPage = lazy(async () => {
  const module = await import('@/pages/symptom-check-in/symptom-check-in-page');
  return { default: module.SymptomCheckInPage };
});

const OnboardingPage = lazy(async () => {
  const module = await import('@/pages/onboarding/onboarding-page');
  return { default: module.OnboardingPage };
});

const HistoryPage = lazy(async () => {
  const module = await import('@/pages/history/history-page');
  return { default: module.HistoryPage };
});

const ProjectOverviewPage = lazy(async () => {
  const module = await import('@/pages/project-overview/project-overview-page');
  return { default: module.ProjectOverviewPage };
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
        element: <OverviewPage />,
      },
      {
        path: 'dashboard',
        element: <DashboardPage />,
      },
      {
        path: 'posture',
        element: <LiveMonitorPage />,
      },
      {
        path: 'live-monitor',
        element: <Navigate to="/posture" replace />,
      },
      {
        path: 'symptoms',
        element: <SymptomCheckInPage />,
      },
      {
        path: 'symptom-check-in',
        element: <SymptomCheckInPage />,
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
        path: 'project-overview',
        element: <ProjectOverviewPage />,
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
  return <PageLoader />;
}
