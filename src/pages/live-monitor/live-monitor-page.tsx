import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { PageHeader } from '@/components/common/page-header';
import { CameraCard } from '@/components/posture/camera-card';
import { readPreferredPoseModelVariant } from '@/core/inference/inference.constants';
import { formatCalibrationSummary } from '@/core/posture/posture-calibration';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useCalibrationProfile } from '@/hooks/useCalibrationProfile';
import { useCamera } from '@/hooks/useCamera';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useLiveMetrics } from '@/hooks/useLiveMetrics';
import { useLivePostureState } from '@/hooks/useLivePostureState';
import { useMonitoringSession } from '@/hooks/useMonitoringSession';
import { usePoseStream } from '@/hooks/usePoseStream';
import { useReminders } from '@/hooks/useReminders';
import type { ActiveReminder } from '@/core/reminders/reminder.types';
import type { LivePostureState, MonitoringSession } from '@/types/domain';

type PostureViewMode = 'live' | 'stats';

const MODE_STORAGE_KEY = 'last-mile:posture-view-mode';

export function LiveMonitorPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedMode = parseMode(searchParams.get('mode'));
  const [mode, setMode] = useState<PostureViewMode>(
    () => requestedMode ?? readMode(),
  );
  const camera = useCamera();
  const appSettings = useAppSettings();
  const calibration = useCalibrationProfile();
  const dashboard = useDashboardData();
  const streamReady = camera.status === 'ready' && Boolean(camera.stream);
  const poseStream = usePoseStream(camera.videoRef, {
    enabled: streamReady,
    preferredModelVariant: readPreferredPoseModelVariant(),
  });
  const { processedPose } = useLiveMetrics(poseStream.latestPose);
  const livePostureState = useLivePostureState(
    processedPose,
    calibration.profile,
  );
  const reminders = useReminders({
    enabled: streamReady,
    settings: appSettings.settings.reminderSettings,
    postureState: livePostureState.displayState,
    frameQualityState: processedPose?.frameQuality.state ?? 'GOOD',
    latestTimestamp:
      processedPose?.features.timestamp ??
      poseStream.latestPose?.timestamp ??
      null,
    sessionId: null,
  });
  const monitoringSession = useMonitoringSession({
    enabled: streamReady,
    postureSnapshot: livePostureState.snapshot,
    latestTimestamp:
      processedPose?.features.timestamp ??
      poseStream.latestPose?.timestamp ??
      null,
    sessionEligible: reminders.sessionEligible,
    sessionEndAt: reminders.sessionEndAt,
    sessionSummary: reminders.sessionSummary,
  });

  useEffect(() => {
    if (requestedMode && requestedMode !== mode) {
      setMode(requestedMode);
    }
  }, [mode, requestedMode]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(MODE_STORAGE_KEY, mode);
    }
  }, [mode]);

  const overlayState = mapLiveStateToOverlayState(livePostureState.displayState);

  const calibrationSummary = calibration.profile
    ? formatCalibrationSummary(calibration.profile)
    : null;
  const postureSummaryLabel = getPostureSummaryLabel(overlayState);
  const overlaySubtitle = getOverlaySubtitle(
    overlayState,
    livePostureState.displayReason,
  );
  const activeOrLatestSessionSummary = monitoringSession.activeSession
    ? summarizeLiveSession(reminders.sessionSummary)
    : monitoringSession.latestCompletedSession
      ? summarizePersistedSession(monitoringSession.latestCompletedSession)
      : null;

  function updateMode(nextMode: PostureViewMode) {
    setMode(nextMode);
    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.set('mode', nextMode);
    setSearchParams(nextSearchParams, { replace: true });
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Posture"
        title="A cleaner posture workspace with live and stats modes"
        description="Live mode keeps the camera experience immersive. Stats mode keeps the saved posture charts and summaries in one focused place without mixing in symptom or combined-history UI."
        compact
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <ModeToggle mode={mode} onChange={updateMode} />
            <Link
              to="/history"
              className="inline-flex items-center rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Open history
            </Link>
          </div>
        }
      />

      {mode === 'live' ? (
        <>
          <section className="grid gap-4 xl:grid-cols-[1.45fr_0.85fr]">
            <div className="space-y-3">
              <CameraCard
                cameraDevices={camera.devices}
                cameraError={camera.error}
                currentPostureLabel={postureSummaryLabel}
                frameQualityState={processedPose?.frameQuality.state ?? null}
                onCameraChange={(deviceId) => {
                  void camera.changeCamera(deviceId);
                }}
                onStartCamera={() => {
                  void camera.startCamera(camera.selectedDeviceId || undefined);
                }}
                onStopCamera={() => {
                  camera.stopCamera();
                }}
                overlayState={overlayState}
                overlaySubtitle={overlaySubtitle}
                pose={poseStream.latestPose}
                selectedDeviceId={camera.selectedDeviceId}
                sessionDurationLabel={formatSecondsCompact(
                  reminders.sessionMetrics.totalSessionDurationSec ||
                    monitoringSession.activeSession?.totalDurationSec ||
                    0,
                )}
                stableDurationLabel={formatDurationMs(
                  livePostureState.displayStateDurationMs,
                )}
                streamReady={streamReady}
                videoRef={camera.videoRef}
                workerDisplayState={poseStream.workerDisplayState}
                workerState={poseStream.workerState}
                startDisabled={!camera.isSupported}
              />
              <InlineNudgeBanner
                reminder={reminders.activeReminder}
                onDismiss={reminders.dismissReminder}
              />
            </div>

            <div className="space-y-4">
              <article className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-panel backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent-300">
                  Session summary
                </p>
                <h2 className="mt-1.5 text-[1.35rem] font-semibold tracking-[-0.02em] text-white">
                  {monitoringSession.activeSession
                    ? 'Your current session'
                    : 'Latest completed session'}
                </h2>
                {activeOrLatestSessionSummary ? (
                  <>
                    <div className="mt-4 space-y-2.5">
                      <SummaryRow
                        label="Session label"
                        value={activeOrLatestSessionSummary.sessionScoreLabel}
                        emphasis
                        icon="posture"
                      />
                      <SummaryRow
                        label="Session duration"
                        value={formatSecondsCompact(
                          activeOrLatestSessionSummary.durationSec,
                        )}
                        icon="time"
                      />
                      <SummaryRow
                        label="Good posture"
                        value={`${activeOrLatestSessionSummary.goodPosturePercent}%`}
                        icon="break"
                      />
                      <SummaryRow
                        label="Breaks / nudges"
                        value={`${activeOrLatestSessionSummary.breakCount} / ${activeOrLatestSessionSummary.nudgeCount}`}
                        icon="break"
                      />
                    </div>
                    {activeOrLatestSessionSummary.insights.length > 0 ? (
                      <div className="mt-4 space-y-2">
                        {activeOrLatestSessionSummary.insights
                          .slice(0, 2)
                          .map((insight) => (
                            <p
                              key={insight}
                              className="rounded-2xl border border-white/10 bg-slate-950/45 px-4 py-3 text-sm leading-6 text-slate-300"
                            >
                              {insight}
                            </p>
                          ))}
                      </div>
                    ) : null}
                    <div className="mt-4 space-y-2">
                      <p className="rounded-2xl border border-white/10 bg-slate-950/45 px-4 py-3 text-sm leading-6 text-slate-200">
                        {activeOrLatestSessionSummary.reflectionLine}
                      </p>
                      <p className="rounded-2xl border border-white/[0.08] bg-slate-950/25 px-4 py-3 text-sm leading-6 text-slate-400">
                        {activeOrLatestSessionSummary.recoverySuggestion}
                      </p>
                    </div>
                  </>
                ) : (
                  <p className="mt-4 rounded-2xl border border-dashed border-white/10 bg-slate-950/35 px-4 py-4 text-sm leading-6 text-slate-400">
                    Start a posture session to build a local summary here.
                  </p>
                )}
              </article>

              <article className="rounded-3xl border border-white/[0.08] bg-slate-950/50 p-4 shadow-panel">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent-300/85">
                  Calibration
                </p>
                {calibration.profile && calibrationSummary ? (
                  <div className="mt-3 space-y-2.5 text-sm text-slate-300">
                    <SummaryRow
                      label="Mild slouch"
                      value={`${calibration.profile.mildSlouchThreshold.toFixed(2)} deg`}
                    />
                    <SummaryRow
                      label="Deep slouch"
                      value={`${calibration.profile.deepSlouchThreshold.toFixed(2)} deg`}
                    />
                    <SummaryRow
                      label="Head offset"
                      value={`${calibration.profile.headOffsetWarningThreshold.toFixed(3)} norm`}
                    />
                    <SummaryRow
                      label="Reminder cooldown"
                      value={`${appSettings.settings.reminderSettings.reminderCooldownMin} min`}
                    />
                  </div>
                ) : (
                  <p className="mt-2.5 text-[0.92rem] leading-6 text-slate-400">
                    Visit onboarding to capture a personal baseline before
                    posture classification begins.
                  </p>
                )}
              </article>

              <details className="rounded-3xl border border-white/10 bg-slate-950/60 p-5 shadow-panel">
                <summary className="cursor-pointer list-none text-sm font-semibold uppercase tracking-[0.22em] text-accent-300 marker:hidden">
                  Advanced details
                </summary>
                <dl className="mt-4 space-y-3 text-sm text-slate-300">
                  <MetricRow
                    label="Model"
                    value={poseStream.workerState.modelName ?? 'pending'}
                  />
                  <MetricRow
                    label="Worker"
                    value={poseStream.workerDisplayState.workerLabel.replace(
                      'Worker: ',
                      '',
                    )}
                  />
                  <MetricRow
                    label="Backend"
                    value={poseStream.workerState.backend ?? 'pending'}
                  />
                  <MetricRow
                    label="Signal quality"
                    value={processedPose?.stability.signalQuality ?? 'pending'}
                  />
                  <MetricRow
                    label="Frame quality"
                    value={
                      processedPose
                        ? `${processedPose.frameQuality.state} (${processedPose.frameQuality.score.toFixed(2)})`
                        : 'pending'
                    }
                  />
                  <MetricRow
                    label="Displayed state"
                    value={livePostureState.displayState}
                  />
                  <MetricRow
                    label="Runtime state"
                    value={livePostureState.state}
                  />
                  <MetricRow
                    label="Candidate state"
                    value={livePostureState.candidateState}
                  />
                  <MetricRow
                    label="Baseline-relative scoring"
                    value={calibration.profile ? 'active' : 'defaults'}
                  />
                  <MetricRow
                    label="Trunk angle"
                    value={formatFeatureValue(processedPose?.features.trunkAngleDeg, 'deg')}
                  />
                  <MetricRow
                    label="Head forward ratio"
                    value={formatFeatureValue(processedPose?.features.headForwardRatio, 'x')}
                  />
                  <MetricRow
                    label="Shoulder compression"
                    value={formatFeatureValue(processedPose?.features.shoulderCompressionRatio, 'x')}
                  />
                  <MetricRow
                    label="Sitting bout"
                    value={formatSecondsCompact(
                      reminders.contextSnapshot.sittingBoutDurationSec,
                    )}
                  />
                  <MetricRow
                    label="Slouch bout"
                    value={formatSecondsCompact(
                      reminders.contextSnapshot.slouchDurationSec,
                    )}
                  />
                  <MetricRow
                    label="Away duration"
                    value={formatSecondsCompact(
                      reminders.contextSnapshot.awayDurationSec,
                    )}
                  />
                </dl>
              </details>
            </div>
          </section>
        </>
      ) : (
        <>
          <section className="grid gap-4 xl:grid-cols-4">
            <MetricTile
              label="7-day monitoring"
              value={formatSecondsCompact(dashboard.summary.totalMonitoringSec)}
            />
            <MetricTile
              label="Posture quality"
              value={`${dashboard.summary.postureQualityPct}%`}
            />
            <MetricTile
              label="Breaks"
              value={String(dashboard.summary.totalBreaks)}
            />
            <MetricTile
              label="Longest bout"
              value={formatSecondsCompact(
                dashboard.summary.longestSittingBoutSec,
              )}
            />
          </section>

          <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <article className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-panel backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent-300">
                Stats mode
              </p>
              <h2 className="mt-2 font-display text-2xl text-white">
                Monitoring vs sitting
              </h2>
              {dashboard.trendPoints.some(
                (point) => point.monitoringMinutes > 0,
              ) ? (
                <div className="mt-6 h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dashboard.trendPoints}>
                      <CartesianGrid
                        stroke="rgba(148, 163, 184, 0.12)"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="label"
                        stroke="#94a3b8"
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke="#94a3b8"
                        tickLine={false}
                        axisLine={false}
                        width={40}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(2, 6, 23, 0.92)',
                          border: '1px solid rgba(148, 163, 184, 0.18)',
                          borderRadius: '18px',
                          color: '#e2e8f0',
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="monitoringMinutes"
                        stroke="#67e8f9"
                        strokeWidth={2}
                        fill="#0f766e33"
                        name="Monitoring (min)"
                      />
                      <Area
                        type="monotone"
                        dataKey="sittingMinutes"
                        stroke="#38bdf8"
                        strokeWidth={2}
                        fill="#0ea5e933"
                        name="Sitting (min)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyState>
                  Finish a monitoring session and this chart will start plotting
                  local posture activity.
                </EmptyState>
              )}
            </article>

            <article className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-panel">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent-300">
                Posture mix
              </p>
              <div className="mt-5 space-y-3">
                {dashboard.postureDistribution.some((entry) => entry.value > 0) ? (
                  dashboard.postureDistribution.map((entry) => (
                    <div
                      key={entry.label}
                      className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-semibold text-white">
                          {entry.label}
                        </span>
                        <span>{formatSecondsCompact(entry.value)}</span>
                      </div>
                      <div className="mt-3 h-2 rounded-full bg-slate-900">
                        <div
                          className="h-2 rounded-full"
                          style={{
                            width: `${Math.max(entry.minutes, 0)}%`,
                            backgroundColor: entry.color,
                          }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState>
                    Posture distribution appears after stored daily rollups have
                    sitting time.
                  </EmptyState>
                )}
              </div>
            </article>
          </section>
        </>
      )}
    </div>
  );
}

type ModeToggleProps = {
  mode: PostureViewMode;
  onChange: (mode: PostureViewMode) => void;
};

function ModeToggle({ mode, onChange }: ModeToggleProps) {
  return (
    <div className="inline-flex rounded-full border border-white/10 bg-slate-950/70 p-1">
      {(['live', 'stats'] as const).map((option) => (
        <button
          key={option}
          type="button"
          className={[
            'rounded-full px-4 py-2 text-sm font-semibold capitalize transition',
            mode === option
              ? 'bg-accent-300 text-slate-950'
              : 'text-slate-300 hover:bg-white/10 hover:text-white',
          ].join(' ')}
          aria-pressed={mode === option}
          onClick={() => {
            onChange(option);
          }}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

type ReminderBannerProps = {
  reminder: ActiveReminder | null;
  onDismiss: () => void;
};

function InlineNudgeBanner({ reminder, onDismiss }: ReminderBannerProps) {
  const accentClassName =
    reminder?.type === 'BREAK_NUDGE'
      ? 'border-emerald-300/20 bg-emerald-400/8 text-emerald-50'
      : reminder?.severity === 'strong'
        ? 'border-amber-300/20 bg-amber-400/10 text-amber-50'
        : 'border-sky-300/20 bg-sky-400/8 text-sky-50';

  return (
    <div
      className={[
        'overflow-hidden transition-all duration-300 ease-in-out',
        reminder
          ? 'max-h-24 translate-y-0 opacity-100'
          : 'pointer-events-none max-h-0 -translate-y-1 opacity-0',
      ].join(' ')}
    >
      {reminder ? (
        <section
          className={`flex items-center justify-between gap-4 rounded-2xl border px-4 py-3 shadow-panel ${accentClassName}`}
        >
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-current/15 bg-white/5 text-current">
              <NudgeIcon type={reminder.type} />
            </span>
            <p className="text-sm font-medium text-current/95">
              {reminder.message}
            </p>
          </div>
          <button
            type="button"
            className="rounded-full border border-current/15 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-current/90 transition hover:bg-white/10"
            onClick={onDismiss}
          >
            Dismiss
          </button>
        </section>
      ) : null}
    </div>
  );
}

type MetricTileProps = {
  label: string;
  value: string;
};

function MetricTile({ label, value }: MetricTileProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-300">
        {label}
      </p>
      <p className="mt-3 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

type MetricRowProps = {
  label: string;
  value: string;
};

function MetricRow({ label, value }: MetricRowProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt>{label}</dt>
      <dd className="text-right font-semibold text-white">{value}</dd>
    </div>
  );
}

function EmptyState({ children }: { children: string }) {
  return (
    <div className="mt-6 rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-sm leading-6 text-slate-400">
      {children}
    </div>
  );
}

function parseMode(value: string | null): PostureViewMode | null {
  return value === 'live' || value === 'stats' ? value : null;
}

function readMode(): PostureViewMode {
  if (typeof window === 'undefined') {
    return 'live';
  }

  return parseMode(window.localStorage.getItem(MODE_STORAGE_KEY)) ?? 'live';
}

function formatDurationMs(durationMs: number) {
  const seconds = Math.max(Math.round(durationMs / 1000), 0);
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

function formatSecondsCompact(totalSeconds: number) {
  if (totalSeconds <= 0) {
    return '0s';
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }

  return `${seconds}s`;
}

function SummaryRow({
  label,
  value,
  emphasis = false,
  icon,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
  icon?: 'posture' | 'time' | 'break';
}) {
  return (
    <div
      className={[
        'flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3',
        emphasis ? 'bg-slate-950/72' : '',
      ].join(' ')}
    >
      <span className="flex items-center gap-2.5 text-sm text-slate-400">
        {icon ? <SummaryIcon name={icon} /> : null}
        <span>{label}</span>
      </span>
      <span
        className={[
          'text-sm font-semibold',
          emphasis ? 'text-white' : 'text-slate-100',
        ].join(' ')}
      >
        {value}
      </span>
    </div>
  );
}

function SummaryIcon({ name }: { name: 'posture' | 'time' | 'break' }) {
  const commonProps = {
    className: 'h-4 w-4 text-accent-300/80',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };

  switch (name) {
    case 'posture':
      return (
        <svg viewBox="0 0 24 24" {...commonProps}>
          <path d="M12 4a2 2 0 1 1 0 4 2 2 0 0 1 0-4Z" />
          <path d="M10.5 10.5 12 8l1.5 2.5v3.5" />
          <path d="M9 20v-4l3-2 3 2v4" />
        </svg>
      );
    case 'time':
      return (
        <svg viewBox="0 0 24 24" {...commonProps}>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 8v4l3 2" />
        </svg>
      );
    case 'break':
      return (
        <svg viewBox="0 0 24 24" {...commonProps}>
          <path d="m5 15 4-4 3 3 7-7" />
          <path d="M16 7h3v3" />
        </svg>
      );
    default:
      return null;
  }
}

function NudgeIcon({ type }: { type: ActiveReminder['type'] }) {
  const commonProps = {
    className: 'h-4 w-4',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };

  if (type === 'BREAK_NUDGE') {
    return (
      <svg viewBox="0 0 24 24" {...commonProps}>
        <path d="M8 4v4" />
        <path d="M16 4v4" />
        <path d="M6 11h12" />
        <path d="M8 20h8" />
        <path d="M12 11v9" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" {...commonProps}>
      <path d="M12 4a2 2 0 1 1 0 4 2 2 0 0 1 0-4Z" />
      <path d="M10.5 10.5 12 8l1.5 2.5v3.5" />
      <path d="M9 20v-4l3-2 3 2v4" />
    </svg>
  );
}

function getPostureSummaryLabel(
  state: ReturnType<typeof mapLiveStateToOverlayState>,
) {
  switch (state) {
    case 'good':
      return 'Good posture';
    case 'bad':
      return 'Slouch detected';
    case 'detecting':
      return 'Detecting posture';
    case 'no-person':
    default:
      return 'No one detected';
  }
}

function getOverlaySubtitle(
  state: ReturnType<typeof mapLiveStateToOverlayState>,
  displayReason: string,
) {
  switch (state) {
    case 'good':
      return 'Stay relaxed and keep your shoulders level.';
    case 'bad':
      return 'Lift your chest gently and sit a little taller.';
    case 'detecting':
      return getDetectingSubtitle(displayReason);
    case 'no-person':
    default:
      return 'Keep your head and shoulders visible in the camera frame.';
  }
}

function mapLiveStateToOverlayState(state: LivePostureState) {
  if (state === 'GOOD_POSTURE') {
    return 'good' as const;
  }

  if (state === 'NO_PERSON' || state === 'AWAY') {
    return 'no-person' as const;
  }

  if (state === 'DETECTING') {
    return 'detecting' as const;
  }

  return 'bad' as const;
}

function getDetectingSubtitle(displayReason: string) {
  const lowerReason = displayReason.toLocaleLowerCase();

  if (
    lowerReason.includes('move slightly back') ||
    lowerReason.includes('centered in frame') ||
    lowerReason.includes('shoulders are clearly visible') ||
    lowerReason.includes('upper torso')
  ) {
    return displayReason;
  }

  return 'Hold still for a moment while posture is measured.';
}

function summarizePersistedSession(session: MonitoringSession) {
  return {
    durationSec: session.totalDurationSec,
    goodPosturePercent: session.goodPosturePercent ?? 0,
    breakCount: session.breakCount,
    nudgeCount: session.nudgeCount ?? 0,
    sessionScoreLabel: session.sessionScoreLabel ?? 'Okay',
    insights: session.insights ?? [],
    reflectionLine:
      session.reflectionLine ?? 'This session had a mix of steadiness and drift.',
    recoverySuggestion:
      session.recoverySuggestion ?? 'Try a quick reset earlier next time.',
  };
}

function summarizeLiveSession(
  sessionSummary: ReturnType<typeof useReminders>['sessionSummary'],
) {
  return {
    durationSec: Math.round(sessionSummary.durationMs / 1000),
    goodPosturePercent: sessionSummary.goodPosturePercent,
    breakCount: sessionSummary.breakCount,
    nudgeCount: sessionSummary.nudgeCount,
    sessionScoreLabel: sessionSummary.sessionScoreLabel,
    insights: sessionSummary.insights,
    reflectionLine: sessionSummary.reflectionLine,
    recoverySuggestion: sessionSummary.recoverySuggestion,
  };
}

function formatFeatureValue(value: number | null | undefined, unit: string) {
  if (typeof value !== 'number') {
    return 'pending';
  }

  return `${value.toFixed(2)} ${unit}`;
}
