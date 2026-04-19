import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { DashboardCard } from '@/components/ui/dashboard-card';

export function OverviewPage() {
  return (
    <div className="space-y-6">
      <DashboardCard glow="blue" className="p-7 lg:p-8">
        <div className="max-w-3xl space-y-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#7EA8E6]">
            Overview
          </p>
          <h1 className="text-[2.2rem] font-semibold leading-[1.05] tracking-[-0.04em] text-[#F6FAFF] sm:text-[2.7rem]">
            A calmer way to start your local desk-health review
          </h1>
          <p className="max-w-2xl text-[0.98rem] leading-7 text-[#A7B7D6]">
            Last Mile keeps posture tracking, symptom logging, and daily review
            in one privacy-first browser workspace. Start from here, then move
            into the part of the app you need right now.
          </p>
        </div>
      </DashboardCard>

      <section className="grid gap-5 xl:grid-cols-3">
        <OverviewActionCard
          to="/posture?mode=live"
          eyebrow="Posture"
          title="Start posture tracking"
          description="Open the live posture workspace with the camera-centered view and current session status."
          icon={<ActionIcon name="pulse" />}
        />
        <OverviewActionCard
          to="/symptoms"
          eyebrow="Symptoms"
          title="Log symptoms"
          description="Record discomfort, fatigue, or focus-related symptoms locally with your saved symptom labels."
          icon={<ActionIcon name="heart" />}
        />
        <OverviewActionCard
          to="/history"
          eyebrow="History"
          title="View history"
          description="Review combined daily posture and symptom records with your saved local filters."
          icon={<ActionIcon name="calendar" />}
        />
      </section>
    </div>
  );
}

function OverviewActionCard({
  to,
  eyebrow,
  title,
  description,
  icon,
}: {
  to: string;
  eyebrow: string;
  title: string;
  description: string;
  icon: ReactNode;
}) {
  return (
    <Link to={to} className="group block">
      <DashboardCard className="h-full p-6 transition-all duration-200 ease-in-out group-hover:-translate-y-0.5 group-hover:border-white/[0.11] group-hover:bg-[linear-gradient(180deg,#182543_0%,#141d31_100%)]">
        <div className="flex h-full flex-col">
          <div className="flex h-12 w-12 items-center justify-center rounded-[15px] bg-[#173866] text-[#5BC0FF] transition duration-200 ease-in-out group-hover:bg-[#1A4278]">
            {icon}
          </div>
          <div className="mt-5 space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7EA8E6]">
              {eyebrow}
            </p>
            <h2 className="text-[1.4rem] font-semibold tracking-[-0.03em] text-[#F3F7FF]">
              {title}
            </h2>
            <p className="text-[0.95rem] leading-6 text-[#A7B7D6]">
              {description}
            </p>
          </div>
          <div className="mt-6 inline-flex items-center gap-2 text-[0.95rem] font-semibold text-[#76CFFF] transition duration-200 ease-in-out group-hover:text-[#9BD9FF]">
            Open
            <span aria-hidden="true">-&gt;</span>
          </div>
        </div>
      </DashboardCard>
    </Link>
  );
}

function ActionIcon({
  name,
}: {
  name: 'pulse' | 'heart' | 'calendar';
}) {
  const commonProps = {
    className: 'h-5 w-5',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };

  switch (name) {
    case 'pulse':
      return (
        <svg viewBox="0 0 24 24" {...commonProps}>
          <path d="M4 12h4l2-5 4 10 2-5h4" />
        </svg>
      );
    case 'heart':
      return (
        <svg viewBox="0 0 24 24" {...commonProps}>
          <path d="M12 21c-4.6-3.2-8-6-8-10.4A4.6 4.6 0 0 1 8.6 6c1.5 0 2.8.7 3.4 1.9A3.8 3.8 0 0 1 15.4 6 4.6 4.6 0 0 1 20 10.6C20 15 16.6 17.8 12 21Z" />
        </svg>
      );
    case 'calendar':
      return (
        <svg viewBox="0 0 24 24" {...commonProps}>
          <path d="M7 3v4" />
          <path d="M17 3v4" />
          <rect x="4" y="5" width="16" height="15" rx="2" />
          <path d="M4 10h16" />
        </svg>
      );
    default:
      return null;
  }
}
