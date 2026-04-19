import { NavLink } from 'react-router-dom';
import {
  primaryNavigationItems,
  utilityNavigationItems,
} from '@/app/config/navigation';

export function AppSidebar() {
  const settingsItem = utilityNavigationItems.find((item) => item.to === '/settings');

  return (
    <aside className="app-scroll fixed inset-y-0 left-0 z-40 hidden h-screen w-[232px] flex-col overflow-y-auto border-r border-white/[0.07] bg-[#0F172A] md:flex">
      <div className="border-b border-white/[0.07] px-6 py-5">
        <NavLink to="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-gradient-to-br from-[#4D8DFF] to-[#5BC0FF] shadow-[0_12px_24px_-18px_rgba(91,192,255,0.8)]">
            <BrandMark />
          </div>
          <div>
            <h1 className="text-[1.44rem] font-semibold tracking-[-0.03em] text-[#EAF2FF]">
              Last Mile
            </h1>
            <p className="text-[0.82rem] text-[#7D90B2]">Desk Health</p>
          </div>
        </NavLink>
      </div>

      <div className="flex flex-1 flex-col px-4 py-5">
        <div className="space-y-3">
          <nav className="space-y-2.5" aria-label="Primary">
            {primaryNavigationItems.map((item) => (
              <SidebarLink
                key={item.to}
                to={item.to}
                label={item.label}
                icon={item.icon}
              />
            ))}
          </nav>
        </div>

        <div className="flex-1" />

        <div className="space-y-2.5 border-t border-white/[0.07] pt-4">
          <div className="px-3">
            <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-[#607699]">
              Settings
            </p>
          </div>
          <nav className="space-y-2" aria-label="Utilities">
            {settingsItem ? (
              <SidebarLink
                key={settingsItem.to}
                to={settingsItem.to}
                label={settingsItem.label}
                icon={settingsItem.icon}
              />
            ) : null}
          </nav>
        </div>
      </div>
    </aside>
  );
}

export function MobileBottomNav() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-white/8 bg-[#0F172A]/95 px-3 py-3 shadow-[0_-16px_40px_rgba(5,10,24,0.6)] backdrop-blur md:hidden"
      aria-label="Primary mobile"
    >
      <div className="mx-auto grid max-w-md grid-cols-5 gap-2">
        {primaryNavigationItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              [
                'flex min-w-0 flex-col items-center gap-2 rounded-2xl px-2 py-2 text-center text-[11px] font-semibold transition-all duration-200 ease-in-out',
                isActive
                  ? 'bg-[#182544] text-[#5BC0FF]'
                  : 'text-[#92A4C3] hover:bg-white/5 hover:text-[#EAF2FF]',
              ].join(' ')
            }
          >
            <span className="flex h-5 w-5 items-center justify-center">
              <SidebarIcon name={item.icon} />
            </span>
            <span className="truncate">{item.shortLabel}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

type SidebarLinkProps = {
  to: string;
  label: string;
  icon: string;
  end?: boolean;
};

function SidebarLink({ to, label, icon, end = false }: SidebarLinkProps) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        [
          'flex items-center gap-3 rounded-[15px] border px-4 py-[0.8rem] text-[0.94rem] font-medium transition-all duration-200 ease-in-out',
          isActive
            ? 'border-transparent bg-[#182544] text-[#67C7FF] shadow-[inset_0_0_0_1px_rgba(91,192,255,0.06)]'
            : 'border-transparent text-[#B6C6E2] hover:bg-white/[0.028] hover:text-[#EAF2FF]',
        ].join(' ')
      }
    >
      <span className="flex h-5 w-5 items-center justify-center text-current">
        <SidebarIcon name={icon} />
      </span>
      <span>{label}</span>
    </NavLink>
  );
}

function BrandMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6 text-white"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 12h4l2-5 4 10 2-5h4" />
    </svg>
  );
}

function SidebarIcon({ name }: { name: string }) {
  switch (name) {
    case 'overview':
      return (
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M3 11.5 12 4l9 7.5" />
          <path d="M5.5 10.5V20h13V10.5" />
          <path d="M9.5 20v-5h5v5" />
        </svg>
      );
    case 'posture':
      return (
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M4 12h4l2-6 4 12 2-6h4" />
        </svg>
      );
    case 'symptoms':
      return (
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 21c-4.6-3.2-8-6-8-10.4A4.6 4.6 0 0 1 8.6 6c1.5 0 2.8.7 3.4 1.9A3.8 3.8 0 0 1 15.4 6 4.6 4.6 0 0 1 20 10.6C20 15 16.6 17.8 12 21Z" />
        </svg>
      );
    case 'history':
      return (
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M7 3v4" />
          <path d="M17 3v4" />
          <rect x="4" y="5" width="16" height="15" rx="2" />
          <path d="M4 10h16" />
        </svg>
      );
    case 'project':
      return (
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M4 6.5 12 4l8 2.5v11L12 20l-8-2.5Z" />
          <path d="M12 4v16" />
        </svg>
      );
    case 'settings':
      return (
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="3.2" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 0 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3h.1A1.7 1.7 0 0 0 10.2 3V3a2 2 0 0 1 4 0v.2a1.7 1.7 0 0 0 1 1.5h.1a1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.2a1.7 1.7 0 0 0-1.5 1Z" />
        </svg>
      );
    case 'onboarding':
      return (
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M5 20h14" />
          <path d="M12 4v11" />
          <path d="m8.5 8.5 3.5-3.5 3.5 3.5" />
        </svg>
      );
    case 'privacy':
      return (
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 3 5 6v6c0 4.7 2.8 7.7 7 9 4.2-1.3 7-4.3 7-9V6Z" />
          <path d="M9.2 12 11 13.8 15 9.8" />
        </svg>
      );
    default:
      return null;
  }
}
