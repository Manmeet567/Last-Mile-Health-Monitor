export const primaryNavigationItems = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    shortLabel: 'Dash',
    icon: 'overview',
  },
  { to: '/posture', label: 'Posture', shortLabel: 'Posture', icon: 'posture' },
  {
    to: '/symptoms',
    label: 'Symptoms',
    shortLabel: 'Symptoms',
    icon: 'symptoms',
  },
  { to: '/history', label: 'History', shortLabel: 'History', icon: 'history' },
  {
    to: '/project-overview',
    label: 'Project',
    shortLabel: 'Project',
    icon: 'project',
  },
] as const;

export const utilityNavigationItems = [
  { to: '/settings', label: 'Settings', icon: 'settings' },
  { to: '/onboarding', label: 'Onboarding', icon: 'onboarding' },
  { to: '/privacy', label: 'Privacy', icon: 'privacy' },
] as const;
