import { PageHeader } from '@/components/common/page-header';
import { CameraPreview } from '@/components/camera/camera-preview';
import { DEFAULT_KEYPOINT_SCORE_THRESHOLD } from '@/core/inference/inference.constants';
import { formatCalibrationSummary } from '@/core/posture/posture-calibration';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useCalibrationProfile } from '@/hooks/useCalibrationProfile';
import { useCamera } from '@/hooks/useCamera';
import { useLiveMetrics } from '@/hooks/useLiveMetrics';
import { useLivePostureState } from '@/hooks/useLivePostureState';
import { useMonitoringSession } from '@/hooks/useMonitoringSession';
import { usePoseStream } from '@/hooks/usePoseStream';
import { useReminders } from '@/hooks/useReminders';
import type { ActiveReminder } from '@/core/reminders/reminder.types';
import type { DailyMetrics, LivePostureState, MonitoringSession } from '@/types/domain';

export function LiveMonitorPage() {
  const camera = useCamera();
  const appSettings = useAppSettings();
  const calibration = useCalibrationProfile();
  const streamReady = camera.status === 'ready' && Boolean(camera.stream);
  const poseStream = usePoseStream(camera.videoRef, {
    enabled: streamReady,
  });
  const { processedPose } = useLiveMetrics(poseStream.latestPose);
  const livePostureState = useLivePostureState(processedPose, calibration.profile);
  const monitoringSession = useMonitoringSession({
    enabled: streamReady,
    postureSnapshot: livePostureState.snapshot,
    latestTimestamp: processedPose?.features.timestamp ?? poseStream.latestPose?.timestamp ?? null,
  });
  const reminders = useReminders({
    enabled: streamReady,
    settings: appSettings.settings.reminderSettings,
    postureState: livePostureState.state,
    latestTimestamp: processedPose?.features.timestamp ?? poseStream.latestPose?.timestamp ?? null,
    sessionId: monitoringSession.activeSession?.id ?? null,
  });

  const confidentKeypoints = processedPose?.confidence.reliableKeypoints ?? [];
  const normalizedKeypointMap = new Map(
    (processedPose?.normalizedPose?.keypoints ?? []).map((keypoint) => [keypoint.name, keypoint]),
  );
  const calibrationSummary = calibration.profile ? formatCalibrationSummary(calibration.profile) : null;
  const currentTrunkAngle = processedPose?.features.trunkAngleDeg ?? null;
  const currentHeadOffset = processedPose?.features.headForwardOffset ?? null;
  const trunkDelta =
    calibration.profile && currentTrunkAngle !== null
      ? currentTrunkAngle - calibration.profile.baselineTrunkAngle
      : null;
  const headOffsetDelta =
    calibration.profile && currentHeadOffset !== null
      ? currentHeadOffset - calibration.profile.baselineHeadOffset
      : null;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Milestone 6"
        title="Live monitoring now includes reminder nudges"
        description="The live monitor now evaluates cooldown-aware posture and break reminders, logs reminder events locally, and uses saved reminder settings from IndexedDB."
      />

      {reminders.activeReminder ? (
        <ReminderBanner reminder={reminders.activeReminder} onDismiss={reminders.dismissReminder} />
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[1.4fr_0.9fr]">
        <CameraPreview
          videoRef={camera.videoRef}
          pose={poseStream.latestPose}
          workerState={poseStream.workerState}
          workerDisplayState={poseStream.workerDisplayState}
          streamReady={streamReady}
        />

        <div className="space-y-4">
          <article className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-panel backdrop-blur">
            <h2 className="font-display text-xl text-white">Camera controls</h2>
            <div className="mt-4 space-y-4 text-sm text-slate-300">
              <p>
                Status: <span className="font-semibold text-white">{camera.status}</span>
              </p>

              <label className="block space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.24em] text-accent-300">
                  Selected camera
                </span>
                <select
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white"
                  value={camera.selectedDeviceId}
                  onChange={(event) => {
                    void camera.changeCamera(event.target.value);
                  }}
                  disabled={camera.devices.length === 0}
                >
                  {camera.devices.length === 0 ? <option value="">No camera detected yet</option> : null}
                  {camera.devices.map((device) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  className="rounded-full bg-accent-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-accent-300"
                  onClick={() => {
                    void camera.startCamera(camera.selectedDeviceId || undefined);
                  }}
                  disabled={!camera.isSupported}
                >
                  Start camera
                </button>
                <button
                  type="button"
                  className="rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                  onClick={() => {
                    camera.stopCamera();
                  }}
                >
                  Stop camera
                </button>
              </div>

              <p className="text-xs leading-6 text-slate-400">
                Starting the camera now also starts a local monitoring session automatically. Stopping the camera finalizes the session and rolls it into today&apos;s stored summary.
              </p>

              {camera.error ? <p className="text-sm text-orange-200">{camera.error}</p> : null}
              {!camera.isSupported ? (
                <p className="text-sm text-orange-200">
                  This browser does not expose the MediaDevices API required for webcam access.
                </p>
              ) : null}
            </div>
          </article>

          <article className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-panel">
            <h2 className="font-display text-xl text-white">Live posture state</h2>
            <div className="mt-4 space-y-4">
              <StateBadge state={livePostureState.displayState} />
              <dl className="grid grid-cols-2 gap-3 text-sm text-slate-300">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.22em] text-accent-300">Candidate</dt>
                  <dd className="mt-2 text-lg font-semibold text-white">{livePostureState.candidateState}</dd>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.22em] text-accent-300">Stable for</dt>
                  <dd className="mt-2 text-lg font-semibold text-white">{formatDurationMs(livePostureState.displayStateDurationMs)}</dd>
                </div>
              </dl>
              <p className="text-sm leading-6 text-slate-300">{livePostureState.displayReason}</p>
              <p className="text-xs leading-6 text-slate-400">
                Raw runtime state: <span className="font-semibold text-white">{livePostureState.state}</span>
              </p>
            </div>
          </article>

          <article className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-panel">
            <h2 className="font-display text-xl text-white">Reminder engine</h2>
            <div className="mt-4 space-y-4 text-sm text-slate-300">
              <div className="grid grid-cols-2 gap-3">
                <SummaryCard label="Status" value={appSettings.settings.reminderSettings.enabled ? 'enabled' : 'disabled'} />
                <SummaryCard
                  label="Cooldown"
                  value={`${appSettings.settings.reminderSettings.reminderCooldownMin} min`}
                />
                <SummaryCard
                  label="Current sitting bout"
                  value={formatSecondsCompact(reminders.contextSnapshot.sittingBoutDurationSec)}
                />
                <SummaryCard
                  label="Current slouch bout"
                  value={formatSecondsCompact(reminders.contextSnapshot.slouchDurationSec)}
                />
              </div>
              <p className="text-xs leading-6 text-slate-400">
                Cooldown remaining:{' '}
                <span className="font-semibold text-white">
                  {reminders.contextSnapshot.cooldownRemainingSec > 0
                    ? formatSecondsCompact(reminders.contextSnapshot.cooldownRemainingSec)
                    : 'ready'}
                </span>
              </p>
              <p className="text-xs leading-6 text-slate-400">
                Persistence status:{' '}
                <span className="font-semibold text-white">
                  {reminders.isPersisting ? 'saving reminder activity' : 'up to date'}
                </span>
              </p>
              {appSettings.error ? <p className="text-sm text-orange-200">{appSettings.error}</p> : null}
              {reminders.error ? <p className="text-sm text-orange-200">{reminders.error}</p> : null}
            </div>
          </article>

          <article className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-panel">
            <h2 className="font-display text-xl text-white">Monitoring session</h2>
            <div className="mt-4 space-y-4 text-sm text-slate-300">
              <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                <span className="text-xs font-semibold uppercase tracking-[0.22em] text-accent-300">Lifecycle</span>
                <span className="font-semibold text-white">
                  {monitoringSession.activeSession ? 'running' : streamReady ? 'starting' : 'idle'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <SummaryCard
                  label="Session duration"
                  value={formatSecondsCompact(monitoringSession.activeSession?.totalDurationSec ?? 0)}
                />
                <SummaryCard
                  label="Active monitoring"
                  value={formatSecondsCompact(monitoringSession.activeSession?.activeMonitoringSec ?? 0)}
                />
                <SummaryCard
                  label="Sitting time"
                  value={formatSecondsCompact(monitoringSession.activeSession?.sittingSec ?? 0)}
                />
                <SummaryCard label="Breaks" value={String(monitoringSession.activeSession?.breakCount ?? 0)} />
              </div>

              <p className="text-xs leading-6 text-slate-400">
                Persistence status:{' '}
                <span className="font-semibold text-white">
                  {monitoringSession.isPersisting ? 'syncing to local storage' : 'up to date'}
                </span>
              </p>
              {monitoringSession.error ? <p className="text-sm text-orange-200">{monitoringSession.error}</p> : null}
            </div>
          </article>

          <article className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-panel">
            <h2 className="font-display text-xl text-white">Inference status</h2>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-300">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <dt className="text-xs font-semibold uppercase tracking-[0.22em] text-accent-300">Worker</dt>
                <dd className="mt-2 text-lg font-semibold text-white">
                  {poseStream.workerDisplayState.workerLabel.replace('Worker: ', '')}
                </dd>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <dt className="text-xs font-semibold uppercase tracking-[0.22em] text-accent-300">Backend</dt>
                <dd className="mt-2 text-lg font-semibold text-white">{poseStream.workerState.backend ?? 'pending'}</dd>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <dt className="text-xs font-semibold uppercase tracking-[0.22em] text-accent-300">Raw phase</dt>
                <dd className="mt-2 text-lg font-semibold text-white">{poseStream.workerState.phase}</dd>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <dt className="text-xs font-semibold uppercase tracking-[0.22em] text-accent-300">Frame time</dt>
                <dd className="mt-2 text-lg font-semibold text-white">
                  {poseStream.latestPose ? `${poseStream.latestPose.inferenceTimeMs.toFixed(1)} ms` : 'pending'}
                </dd>
              </div>
            </dl>

            {poseStream.workerState.error ? (
              <p className="mt-4 text-sm leading-6 text-orange-200">{poseStream.workerState.error}</p>
            ) : null}
          </article>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.75fr_1.25fr]">
        <article className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-panel backdrop-blur">
          <h2 className="font-display text-xl text-white">Local summaries</h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <MetricsColumn
              title="Today"
              metrics={monitoringSession.todayMetrics}
              emptyText="Today&apos;s local rollup will appear here after the first session is finalized."
            />
            <SessionColumn
              title="Latest saved session"
              session={monitoringSession.latestCompletedSession}
              emptyText="No finalized monitoring session has been saved yet."
            />
          </div>
        </article>

        <article className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-panel">
          <h2 className="font-display text-xl text-white">Feature debug panel</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <FeatureCard label="Trunk angle" value={formatFeatureValue(currentTrunkAngle, 'deg')} />
            <FeatureCard label="Head offset" value={formatFeatureValue(currentHeadOffset, 'norm')} />
            <FeatureCard
              label="Shoulder tilt"
              value={formatFeatureValue(processedPose?.features.shoulderTiltDeg, 'deg')}
            />
            <FeatureCard
              label="Shoulder width proxy"
              value={formatFeatureValue(processedPose?.features.shoulderProtractionProxy, 'norm')}
            />
            <FeatureCard
              label="Movement magnitude"
              value={formatFeatureValue(processedPose?.features.movementMagnitude, 'norm')}
            />
            <FeatureCard
              label="Keypoint threshold"
              value={`${DEFAULT_KEYPOINT_SCORE_THRESHOLD.toFixed(2)} score`}
            />
          </div>
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        <article className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-panel backdrop-blur">
          <h2 className="font-display text-xl text-white">Processing snapshot</h2>
          <dl className="mt-4 space-y-3 text-sm text-slate-300">
            <MetricRow label="Reliable keypoints" value={String(confidentKeypoints.length)} />
            <MetricRow
              label="Rejected keypoints"
              value={String(processedPose?.confidence.rejectedKeypoints.length ?? 0)}
            />
            <MetricRow
              label="Pose confidence"
              value={poseStream.latestPose ? poseStream.latestPose.overallScore.toFixed(2) : '0.00'}
            />
            <MetricRow
              label="Confidence sufficient"
              value={processedPose?.features.isConfidenceSufficient ? 'yes' : 'no'}
            />
            <MetricRow
              label="Signal quality"
              value={processedPose?.stability.signalQuality ?? 'pending'}
            />
            <MetricRow
              label="Dropout hold"
              value={processedPose ? formatDurationMs(processedPose.stability.dropoutDurationMs) : '0s'}
            />
            <MetricRow
              label="Missing torso anchors"
              value={
                processedPose?.confidence.missingRequiredKeypoints.length
                  ? processedPose.confidence.missingRequiredKeypoints.join(', ')
                  : 'none'
              }
            />
            <MetricRow
              label="Torso length"
              value={
                processedPose?.normalizedPose
                  ? `${processedPose.normalizedPose.anchors.torsoLength.toFixed(1)} px`
                  : 'pending'
              }
            />
          </dl>
        </article>

        <article className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-panel">
          <h2 className="font-display text-xl text-white">Saved thresholds</h2>
          {calibration.profile && calibrationSummary ? (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <ThresholdCard
                label="Mild slouch"
                value={`${calibration.profile.mildSlouchThreshold.toFixed(2)} deg`}
                detail={`Baseline + ${calibrationSummary.mildSlouchDelta.toFixed(2)} deg`}
              />
              <ThresholdCard
                label="Deep slouch"
                value={`${calibration.profile.deepSlouchThreshold.toFixed(2)} deg`}
                detail={`Baseline + ${calibrationSummary.deepSlouchDelta.toFixed(2)} deg`}
              />
              <ThresholdCard
                label="Head offset"
                value={`${calibration.profile.headOffsetWarningThreshold.toFixed(3)} norm`}
                detail={`Baseline + ${calibrationSummary.headOffsetDelta.toFixed(3)}`}
              />
              <ThresholdCard
                label="Shoulder tilt"
                value={`${calibration.profile.shoulderTiltWarningThreshold.toFixed(2)} deg`}
                detail={`Abs baseline + ${calibrationSummary.shoulderTiltDelta.toFixed(2)} deg`}
              />
            </div>
          ) : (
            <p className="mt-4 text-sm leading-6 text-slate-300">
              Saved threshold values will appear here after onboarding calibration is completed.
            </p>
          )}
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        <article className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-panel backdrop-blur">
          <h2 className="font-display text-xl text-white">Calibration baseline</h2>
          {calibration.profile ? (
            <dl className="mt-4 space-y-3 text-sm text-slate-300">
              <MetricRow label="Sensitivity" value={calibration.profile.preferredSensitivity} />
              <MetricRow label="Samples" value={String(calibration.profile.sampleCount)} />
              <MetricRow label="Baseline trunk" value={`${calibration.profile.baselineTrunkAngle.toFixed(2)} deg`} />
              <MetricRow label="Baseline head offset" value={`${calibration.profile.baselineHeadOffset.toFixed(3)} norm`} />
              <MetricRow
                label="Current trunk delta"
                value={trunkDelta !== null ? `${trunkDelta.toFixed(2)} deg` : 'pending'}
              />
              <MetricRow
                label="Current head delta"
                value={headOffsetDelta !== null ? `${headOffsetDelta.toFixed(3)} norm` : 'pending'}
              />
            </dl>
          ) : (
            <p className="mt-4 text-sm leading-6 text-slate-300">
              No saved calibration yet. Visit onboarding to capture a personal baseline before posture classification work begins.
            </p>
          )}
        </article>

        <section className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-panel">
          <h2 className="font-display text-xl text-white">Normalized keypoint debug feed</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {confidentKeypoints.length > 0 ? (
              confidentKeypoints.map((keypoint) => {
                const normalizedKeypoint = normalizedKeypointMap.get(keypoint.name);

                return (
                  <div key={keypoint.name} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                    <p className="font-semibold uppercase tracking-[0.18em] text-accent-300">{keypoint.name}</p>
                    <p className="mt-2">raw x: {keypoint.x.toFixed(1)}</p>
                    <p>raw y: {keypoint.y.toFixed(1)}</p>
                    <p>score: {keypoint.score.toFixed(2)}</p>
                    <p>norm x: {normalizedKeypoint ? normalizedKeypoint.x.toFixed(3) : 'n/a'}</p>
                    <p>norm y: {normalizedKeypoint ? normalizedKeypoint.y.toFixed(3) : 'n/a'}</p>
                  </div>
                );
              })
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-sm leading-6 text-slate-400 md:col-span-2 xl:col-span-3">
                Start the camera and wait for a stable person-sized detection. This panel will show raw coordinates beside torso-normalized coordinates after the confidence gate passes.
              </div>
            )}
          </div>
        </section>
      </section>
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

type FeatureCardProps = {
  label: string;
  value: string;
};

function FeatureCard({ label, value }: FeatureCardProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent-300">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

type ThresholdCardProps = {
  label: string;
  value: string;
  detail: string;
};

function ThresholdCard({ label, value, detail }: ThresholdCardProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent-300">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-sm text-slate-400">{detail}</p>
    </div>
  );
}

type SummaryCardProps = {
  label: string;
  value: string;
};

function SummaryCard({ label, value }: SummaryCardProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent-300">{label}</p>
      <p className="mt-3 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

type SessionColumnProps = {
  title: string;
  session: MonitoringSession | null;
  emptyText: string;
};

function SessionColumn({ title, session, emptyText }: SessionColumnProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-5">
      <h3 className="text-xs font-semibold uppercase tracking-[0.22em] text-accent-300">{title}</h3>
      {session ? (
        <dl className="mt-4 space-y-3 text-sm text-slate-300">
          <MetricRow label="Duration" value={formatSecondsCompact(session.totalDurationSec)} />
          <MetricRow label="Sitting" value={formatSecondsCompact(session.sittingSec)} />
          <MetricRow label="Breaks" value={String(session.breakCount)} />
          <MetricRow label="Longest bout" value={formatSecondsCompact(session.longestSittingBoutSec)} />
        </dl>
      ) : (
        <p className="mt-4 text-sm leading-6 text-slate-400">{emptyText}</p>
      )}
    </div>
  );
}

type MetricsColumnProps = {
  title: string;
  metrics: DailyMetrics | null;
  emptyText: string;
};

function MetricsColumn({ title, metrics, emptyText }: MetricsColumnProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-5">
      <h3 className="text-xs font-semibold uppercase tracking-[0.22em] text-accent-300">{title}</h3>
      {metrics ? (
        <dl className="mt-4 space-y-3 text-sm text-slate-300">
          <MetricRow label="Monitoring" value={formatSecondsCompact(metrics.totalMonitoringSec)} />
          <MetricRow label="Sitting" value={formatSecondsCompact(metrics.totalSittingSec)} />
          <MetricRow label="Breaks" value={String(metrics.totalBreaks)} />
          <MetricRow label="Good posture" value={formatSecondsCompact(metrics.goodPostureSec)} />
          <MetricRow label="Mild slouch" value={formatSecondsCompact(metrics.mildSlouchSec)} />
          <MetricRow label="Deep slouch" value={formatSecondsCompact(metrics.deepSlouchSec)} />
          <MetricRow label="Reminders" value={String(metrics.remindersTriggered)} />
        </dl>
      ) : (
        <p className="mt-4 text-sm leading-6 text-slate-400">{emptyText}</p>
      )}
    </div>
  );
}

type ReminderBannerProps = {
  reminder: ActiveReminder;
  onDismiss: () => void;
};

function ReminderBanner({ reminder, onDismiss }: ReminderBannerProps) {
  const accentClassName = {
    POSTURE_NUDGE: 'border-amber-400/40 bg-amber-400/10 text-amber-100',
    BREAK_NUDGE: 'border-sky-400/40 bg-sky-400/10 text-sky-100',
    RECOVERY_NUDGE: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-100',
  }[reminder.type];

  return (
    <section className={`rounded-3xl border p-6 shadow-panel ${accentClassName}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.24em]">{reminder.type.replace('_', ' ')}</p>
          <h2 className="font-display text-2xl text-white">{reminder.title}</h2>
          <p className="max-w-3xl text-sm leading-6 text-current/90">{reminder.message}</p>
        </div>
        <button
          type="button"
          className="rounded-full border border-current/20 px-4 py-2 text-sm font-semibold text-current transition hover:bg-white/10"
          onClick={onDismiss}
        >
          Dismiss
        </button>
      </div>
    </section>
  );
}

type StateBadgeProps = {
  state: LivePostureState;
};

function StateBadge({ state }: StateBadgeProps) {
  const className = {
    GOOD_POSTURE: 'border-emerald-400/40 bg-emerald-400/15 text-emerald-200',
    MILD_SLOUCH: 'border-amber-400/40 bg-amber-400/15 text-amber-200',
    DEEP_SLOUCH: 'border-orange-400/40 bg-orange-400/15 text-orange-200',
    MOVING: 'border-sky-400/40 bg-sky-400/15 text-sky-200',
    DETECTING: 'border-white/10 bg-white/5 text-slate-200',
    AWAY: 'border-violet-400/40 bg-violet-400/15 text-violet-200',
    NO_PERSON: 'border-white/10 bg-slate-900/70 text-slate-300',
  }[state];

  return (
    <div className={`inline-flex rounded-full border px-4 py-2 text-sm font-semibold tracking-[0.18em] ${className}`}>
      {state}
    </div>
  );
}

function formatFeatureValue(value: number | null | undefined, suffix: string) {
  if (value === null || typeof value === 'undefined') {
    return 'pending';
  }

  return `${value.toFixed(3)} ${suffix}`;
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

