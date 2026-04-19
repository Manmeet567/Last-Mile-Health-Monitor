import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/common/page-header';

export function ProjectOverviewPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Project Overview"
        title="What Last Mile does"
        description="This page explains what the app tracks, how it stays local, how to use it, and where its boundaries are."
        actions={
          <div className="flex flex-wrap gap-3">
            <QuickAction to="/posture?mode=live" label="Start posture tracking" />
            <QuickAction to="/symptoms" label="Log symptoms" secondary />
            <QuickAction to="/history" label="View history" secondary />
          </div>
        }
      />

      <section className="grid gap-4 xl:grid-cols-2">
        <InfoCard
          title="What this app does"
          body="Last Mile is a browser-based desk health monitor. It brings posture activity, breaks, and symptom check-ins into one local review space."
        />
        <InfoCard
          title="Privacy-first by design"
          body="Posture summaries, symptom check-ins, and review state stay in this browser. There is no cloud backend for this data in the current version."
        />
        <InfoCard
          title="What is tracked"
          body="The app tracks posture summaries, break and reminder behavior, symptom check-ins, saved symptom labels, and combined daily history."
        />
        <InfoCard
          title="Important note"
          body="This is not a medical diagnosis tool. It shows descriptive local records only, without diagnosis, prediction, or treatment guidance."
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-panel backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent-300">
            How to use it
          </p>
          <h2 className="mt-2 font-display text-2xl text-white">
            A simple flow through the app
          </h2>
          <ol className="mt-6 space-y-5 text-sm leading-6 text-slate-300">
            <li>
              1. Open the <span className="font-semibold text-white">Posture</span>{' '}
              tab and start the camera when you want live posture tracking.
            </li>
            <li>
              2. Use the <span className="font-semibold text-white">Symptoms</span>{' '}
              tab to log discomfort, fatigue, or focus-related symptoms manually
              or through the daily reminder entry path.
            </li>
            <li>
              3. Use the <span className="font-semibold text-white">History</span>{' '}
              tab to review combined daily records and apply local filters.
            </li>
            <li>
              4. Use <span className="font-semibold text-white">Settings</span>,{' '}
              <span className="font-semibold text-white">Onboarding</span>, and{' '}
              <span className="font-semibold text-white">Privacy</span> when you
              want calibration, reminder tuning, or local-data controls.
            </li>
          </ol>
        </article>

        <article className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-panel">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent-300">
            Utility pages
          </p>
          <h2 className="mt-2 font-display text-2xl text-white">
            Setup and local controls
          </h2>
          <div className="mt-6 grid gap-3">
            <UtilityLink
              to="/onboarding"
              icon={<UtilityIcon kind="onboarding" />}
              title="Onboarding"
              body="Capture a personal posture baseline before long-term posture review."
            />
            <UtilityLink
              to="/settings"
              icon={<UtilityIcon kind="settings" />}
              title="Settings"
              body="Adjust reminder timing and other active local runtime preferences."
            />
            <UtilityLink
              to="/privacy"
              icon={<UtilityIcon kind="privacy" />}
              title="Privacy"
              body="Inspect local data counts, export JSON, or clear local records."
            />
          </div>
        </article>
      </section>
    </div>
  );
}

function InfoCard({ title, body }: { title: string; body: string }) {
  return (
    <article className="rounded-3xl border border-white/10 bg-slate-950/60 p-6 shadow-panel">
      <h2 className="font-display text-2xl text-white">{title}</h2>
      <p className="mt-3 max-w-[34ch] text-sm leading-6 text-slate-300">{body}</p>
    </article>
  );
}

function UtilityLink({
  icon,
  to,
  title,
  body,
}: {
  icon: ReactNode;
  to: string;
  title: string;
  body: string;
}) {
  return (
    <Link
      to={to}
      className="rounded-3xl border border-white/10 bg-white/5 p-5 text-sm text-slate-300 transition hover:bg-white/10"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-accent-200">
          {icon}
        </div>
        <div>
          <p className="font-display text-xl text-white">{title}</p>
          <p className="mt-2 leading-6 text-slate-400">{body}</p>
        </div>
      </div>
    </Link>
  );
}

function QuickAction({
  to,
  label,
  secondary = false,
}: {
  to: string;
  label: string;
  secondary?: boolean;
}) {
  return (
    <Link
      to={to}
      className={[
        'inline-flex items-center rounded-full px-5 py-3 text-sm font-semibold transition',
        secondary
          ? 'border border-white/10 text-white hover:bg-white/10'
          : 'bg-accent-300 text-slate-950 hover:bg-accent-200',
      ].join(' ')}
    >
      {label}
    </Link>
  );
}

function UtilityIcon({ kind }: { kind: 'onboarding' | 'settings' | 'privacy' }) {
  if (kind === 'onboarding') {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 3v18" />
        <path d="M6 9h12" />
        <path d="M8 21h8" />
      </svg>
    );
  }

  if (kind === 'settings') {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a2 2 0 0 1 0 2.8 2 2 0 0 1-2.8 0l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V20a2 2 0 0 1-4 0v-.2a1 1 0 0 0-.7-.9 1 1 0 0 0-1.1.2l-.1.1a2 2 0 0 1-2.8 0 2 2 0 0 1 0-2.8l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H4a2 2 0 0 1 0-4h.2a1 1 0 0 0 .9-.7 1 1 0 0 0-.2-1.1l-.1-.1a2 2 0 0 1 0-2.8 2 2 0 0 1 2.8 0l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V4a2 2 0 0 1 4 0v.2a1 1 0 0 0 .7.9 1 1 0 0 0 1.1-.2l.1-.1a2 2 0 0 1 2.8 0 2 2 0 0 1 0 2.8l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6h.2a2 2 0 0 1 0 4h-.2a1 1 0 0 0-.9.7Z" />
      </svg>
    );
  }

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3s7 3 7 7c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10 0-4 7-7 7-7Z" />
      <path d="M9.5 12.5 11 14l3.5-3.5" />
    </svg>
  );
}
