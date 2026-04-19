import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/common/page-header';
import { formatBytes } from '@/core/privacy/privacy-export';
import { usePrivacyControls } from '@/hooks/usePrivacyControls';

export function PrivacyPage() {
  const privacy = usePrivacyControls();
  const snapshot = privacy.snapshot;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Milestone 8"
        title="Privacy and local data controls are now first-class features"
        description="This screen explains the trust model, shows what is stored in this browser, and gives the user export and deletion controls without leaving the app."
        actions={
          <div className="flex flex-wrap gap-3">
            <Link
              to="/onboarding"
              className="inline-flex items-center rounded-full bg-accent-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-accent-300"
            >
              Re-run Calibration
            </Link>
            <button
              type="button"
              className="rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              onClick={() => {
                void privacy.refresh();
              }}
              disabled={privacy.isLoading || privacy.activeAction !== null}
            >
              Refresh Local Status
            </button>
          </div>
        }
      />

      <section className="grid gap-4 md:grid-cols-3">
        <TrustCard
          title="Processed in memory"
          body="Camera frames are used only to compute live posture signals. The browser keeps those frames in memory during live analysis instead of sending them to a server."
        />
        <TrustCard
          title="Stored minimally"
          body="IndexedDB keeps local summaries, settings, calibration profiles, posture/reminder events, symptom check-ins, and reusable custom symptom labels. Raw camera frames and video recordings are not part of the storage model."
        />
        <TrustCard
          title="User-controlled"
          body="You can export local data as JSON, clear history, reset calibration, reset settings, or wipe the entire browser-side dataset from this screen."
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <article className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-panel backdrop-blur">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent-300">
                Local data snapshot
              </p>
              <h2 className="mt-2 font-display text-2xl text-white">
                What this browser is storing right now
              </h2>
            </div>
            {privacy.isLoading ? (
              <p className="text-sm text-slate-400">Reading local storage...</p>
            ) : null}
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <MetricCard
              label="Settings records"
              value={String(snapshot?.settingsCount ?? 0)}
            />
            <MetricCard
              label="Calibration profiles"
              value={String(snapshot?.calibrationProfilesCount ?? 0)}
            />
            <MetricCard
              label="Sessions"
              value={String(snapshot?.sessionsCount ?? 0)}
            />
            <MetricCard
              label="Completed sessions"
              value={String(snapshot?.completedSessionsCount ?? 0)}
            />
            <MetricCard
              label="Daily summaries"
              value={String(snapshot?.dailyMetricsCount ?? 0)}
            />
            <MetricCard
              label="Stored events"
              value={String(snapshot?.eventsCount ?? 0)}
            />
            <MetricCard
              label="Symptom check-ins"
              value={String(snapshot?.symptomCheckInsCount ?? 0)}
            />
            <MetricCard
              label="Custom symptoms"
              value={String(snapshot?.savedCustomSymptomsCount ?? 0)}
            />
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <DetailCard
              label="Latest completed session"
              value={
                snapshot?.latestCompletedSessionAt
                  ? formatDateTime(snapshot.latestCompletedSessionAt)
                  : 'None yet'
              }
            />
            <DetailCard
              label="Latest stored event"
              value={
                snapshot?.latestEventAt
                  ? formatDateTime(snapshot.latestEventAt)
                  : 'None yet'
              }
            />
            <DetailCard
              label="Latest symptom check-in"
              value={
                snapshot?.latestSymptomCheckInAt
                  ? formatDateTime(snapshot.latestSymptomCheckInAt)
                  : 'None yet'
              }
            />
          </div>

          <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/55 p-5 text-sm leading-6 text-slate-300">
            <p className="font-semibold text-white">Storage model reminder</p>
            <p className="mt-3">
              The app stores posture summaries, settings, calibration, sessions,
              reminder/event history, symptom check-ins, and reusable custom
              symptom labels locally. Raw webcam footage is not persisted by
              this implementation.
            </p>
          </div>
        </article>

        <article className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-panel">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent-300">
            Runtime status
          </p>
          <h2 className="mt-2 font-display text-2xl text-white">
            Offline and install readiness
          </h2>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <StatusCard
              label="Connection"
              value={privacy.runtimeStatus.isOnline ? 'Online' : 'Offline'}
            />
            <StatusCard
              label="Installed mode"
              value={
                privacy.runtimeStatus.isStandalone
                  ? 'Standalone'
                  : 'Browser tab'
              }
            />
            <StatusCard
              label="Service worker"
              value={
                privacy.runtimeStatus.serviceWorkerSupported
                  ? 'Supported'
                  : 'Unsupported'
              }
            />
            <StatusCard
              label="Approx. storage usage"
              value={formatBytes(privacy.runtimeStatus.storageEstimateBytes)}
            />
          </div>

          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5 text-sm leading-6 text-slate-300">
            <p className="font-semibold text-white">Quota visibility</p>
            <p className="mt-3">
              Storage quota:{' '}
              <span className="font-semibold text-accent-300">
                {formatBytes(privacy.runtimeStatus.storageQuotaBytes)}
              </span>
            </p>
            <p className="mt-2 text-slate-400">
              Offline-capable installation and local-only storage remain part of
              the app promise. This panel makes that runtime state visible
              instead of implicit.
            </p>
          </div>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <article className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-panel backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent-300">
            Data controls
          </p>
          <h2 className="mt-2 font-display text-2xl text-white">
            Export, reset, and clear local data
          </h2>

          <div className="mt-6 space-y-3">
            <ActionRow
              title="Export local data"
              body="Download the current browser-side dataset as a JSON file so another developer or the user can inspect the stored summaries without direct database access."
              buttonLabel={
                privacy.activeAction === 'export'
                  ? 'Exporting...'
                  : 'Export JSON'
              }
              buttonClassName="bg-accent-400 text-slate-950 hover:bg-accent-300"
              disabled={privacy.activeAction !== null}
              onClick={() => {
                void privacy.exportJson();
              }}
            />
            <ActionRow
              title="Reset calibration"
              body="Delete saved calibration profiles only. This keeps history and settings intact, then lets the user re-run onboarding for a new baseline."
              buttonLabel={
                privacy.activeAction === 'reset-calibration'
                  ? 'Resetting...'
                  : 'Reset calibration'
              }
              buttonClassName="border border-white/10 text-white hover:bg-white/10"
              disabled={privacy.activeAction !== null}
              onClick={() => {
                if (
                  !window.confirm(
                    'Reset saved calibration data and keep the rest of the local history?',
                  )
                ) {
                  return;
                }

                void privacy.resetCalibration();
              }}
            />
            <ActionRow
              title="Reset settings"
              body="Restore local settings to defaults, including reminder preferences. This does not remove sessions, events, or calibration profiles."
              buttonLabel={
                privacy.activeAction === 'reset-settings'
                  ? 'Resetting...'
                  : 'Reset settings'
              }
              buttonClassName="border border-white/10 text-white hover:bg-white/10"
              disabled={privacy.activeAction !== null}
              onClick={() => {
                if (
                  !window.confirm(
                    'Reset saved settings to their default values?',
                  )
                ) {
                  return;
                }

                void privacy.resetSettings();
              }}
            />
            <ActionRow
              title="Clear history"
              body="Delete saved sessions, daily summaries, posture events, and symptom check-ins while keeping current settings, calibration profiles, and reusable custom symptom labels."
              buttonLabel={
                privacy.activeAction === 'clear-history'
                  ? 'Clearing...'
                  : 'Clear history'
              }
              buttonClassName="border border-amber-400/30 text-amber-100 hover:bg-amber-400/10"
              disabled={privacy.activeAction !== null}
              onClick={() => {
                if (
                  !window.confirm(
                    'Clear local history but keep settings, calibration, and reusable custom symptom labels?',
                  )
                ) {
                  return;
                }

                void privacy.clearHistory();
              }}
            />
            <ActionRow
              title="Clear all local data"
              body="Delete every local record in this browser, including settings, calibration, sessions, rollups, event history, symptom check-ins, and custom symptom labels. The app will fall back to default settings afterward."
              buttonLabel={
                privacy.activeAction === 'clear-all'
                  ? 'Clearing...'
                  : 'Clear everything'
              }
              buttonClassName="border border-rose-400/30 text-rose-100 hover:bg-rose-400/10"
              disabled={privacy.activeAction !== null}
              onClick={() => {
                if (
                  !window.confirm(
                    'Clear every local record in this browser? This cannot be undone.',
                  )
                ) {
                  return;
                }

                void privacy.clearAll();
              }}
            />
          </div>

          {privacy.message ? (
            <p className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
              {privacy.message}
            </p>
          ) : null}
          {privacy.error ? (
            <p className="mt-5 rounded-2xl border border-orange-400/20 bg-orange-400/10 px-4 py-3 text-sm text-orange-100">
              {privacy.error}
            </p>
          ) : null}
        </article>

        <article className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-panel">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent-300">
            Next safe actions
          </p>
          <h2 className="mt-2 font-display text-2xl text-white">
            Common privacy-friendly workflows
          </h2>

          <div className="mt-6 space-y-4 text-sm leading-6 text-slate-300">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="font-semibold text-white">
                Share the project with another developer
              </p>
              <p className="mt-2">
                Export the local JSON first, then hand off the codebase and the
                status document for implementation context.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="font-semibold text-white">
                Recalibrate after changing your workspace
              </p>
              <p className="mt-2">
                Use onboarding again if your camera angle, chair, or desk setup
                changes enough to shift the baseline.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="font-semibold text-white">
                Start over without losing trust
              </p>
              <p className="mt-2">
                You can clear only history, only calibration, or everything,
                instead of treating all data reset needs as one destructive
                action.
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/settings"
              className="inline-flex items-center rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Open Settings
            </Link>
            <Link
              to="/history"
              className="inline-flex items-center rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Review History
            </Link>
          </div>
        </article>
      </section>
    </div>
  );
}

type TrustCardProps = {
  title: string;
  body: string;
};

function TrustCard({ title, body }: TrustCardProps) {
  return (
    <article className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-panel backdrop-blur">
      <h2 className="font-display text-lg text-white">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-slate-300">{body}</p>
    </article>
  );
}

type MetricCardProps = {
  label: string;
  value: string;
};

function MetricCard({ label, value }: MetricCardProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-4 text-sm text-slate-300">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent-300">
        {label}
      </p>
      <p className="mt-3 font-display text-3xl text-white">{value}</p>
    </div>
  );
}

type DetailCardProps = {
  label: string;
  value: string;
};

function DetailCard({ label, value }: DetailCardProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-4 text-sm text-slate-300">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent-300">
        {label}
      </p>
      <p className="mt-3 font-semibold text-white">{value}</p>
    </div>
  );
}

type StatusCardProps = {
  label: string;
  value: string;
};

function StatusCard({ label, value }: StatusCardProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent-300">
        {label}
      </p>
      <p className="mt-3 font-semibold text-white">{value}</p>
    </div>
  );
}

type ActionRowProps = {
  title: string;
  body: string;
  buttonLabel: string;
  buttonClassName: string;
  disabled: boolean;
  onClick: () => void;
};

function ActionRow({
  title,
  body,
  buttonLabel,
  buttonClassName,
  disabled,
  onClick,
}: ActionRowProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <h3 className="font-semibold text-white">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-300">{body}</p>
        </div>
        <button
          type="button"
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${buttonClassName}`}
          disabled={disabled}
          onClick={onClick}
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  );
}

function formatDateTime(timestamp: number) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(timestamp);
}
