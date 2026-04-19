import { useEffect, useRef, useState } from 'react';
import { CustomSelect } from '@/components/common/custom-select';
import { PageHeader } from '@/components/common/page-header';
import { CameraPreview } from '@/components/camera/camera-preview';
import {
  CALIBRATION_TARGET_SAMPLE_COUNT,
  buildCalibrationProfile,
  formatCalibrationSummary,
  type CalibrationSample,
} from '@/core/posture/posture-calibration';
import { useCalibrationProfile } from '@/hooks/useCalibrationProfile';
import { useCamera } from '@/hooks/useCamera';
import { useLiveMetrics } from '@/hooks/useLiveMetrics';
import { usePoseStream } from '@/hooks/usePoseStream';
import type { CalibrationProfile } from '@/types/domain';

export function OnboardingPage() {
  const camera = useCamera();
  const streamReady = camera.status === 'ready' && Boolean(camera.stream);
  const poseStream = usePoseStream(camera.videoRef, {
    enabled: streamReady,
  });
  const { processedPose } = useLiveMetrics(poseStream.latestPose);
  const calibration = useCalibrationProfile();
  const [preferredSensitivity, setPreferredSensitivity] =
    useState<CalibrationProfile['preferredSensitivity']>('medium');
  const [captureState, setCaptureState] = useState<
    'idle' | 'capturing' | 'saving' | 'completed' | 'error'
  >('idle');
  const [samples, setSamples] = useState<CalibrationSample[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const lastCapturedTimestampRef = useRef<number | null>(null);

  useEffect(() => {
    if (calibration.profile) {
      setPreferredSensitivity(calibration.profile.preferredSensitivity);
    }
  }, [calibration.profile]);

  const isCaptureReady = Boolean(
    processedPose?.features.isConfidenceSufficient &&
    processedPose.normalizedPose &&
    processedPose.features.trunkAngleDeg !== null &&
    processedPose.features.headForwardOffset !== null,
  );

  useEffect(() => {
    if (
      captureState !== 'capturing' ||
      !isCaptureReady ||
      !processedPose?.normalizedPose
    ) {
      return;
    }

    const sampleTimestamp = processedPose.features.timestamp;

    if (lastCapturedTimestampRef.current === sampleTimestamp) {
      return;
    }

    lastCapturedTimestampRef.current = sampleTimestamp;

    setSamples((currentSamples) => {
      if (currentSamples.length >= CALIBRATION_TARGET_SAMPLE_COUNT) {
        return currentSamples;
      }

      return [
        ...currentSamples,
        {
          timestamp: sampleTimestamp,
          trunkAngleDeg: processedPose.features.trunkAngleDeg ?? 0,
          headForwardOffset: processedPose.features.headForwardOffset ?? 0,
          torsoLength: processedPose.normalizedPose?.anchors.torsoLength ?? 0,
        },
      ];
    });
  }, [captureState, isCaptureReady, processedPose]);

  useEffect(() => {
    if (
      captureState !== 'capturing' ||
      samples.length < CALIBRATION_TARGET_SAMPLE_COUNT
    ) {
      return;
    }

    let cancelled = false;

    async function completeCalibration() {
      setCaptureState('saving');
      setMessage('Saving your personal baseline locally.');

      try {
        const nextProfile = buildCalibrationProfile({
          samples,
          preferredSensitivity,
          existingId: calibration.profile?.id,
          now: Date.now(),
        });
        await calibration.save(nextProfile);

        if (cancelled) {
          return;
        }

        setCaptureState('completed');
        setMessage(
          'Calibration complete. Your local posture baseline is saved.',
        );
      } catch (error) {
        if (cancelled) {
          return;
        }

        setCaptureState('error');
        setMessage(
          error instanceof Error
            ? error.message
            : 'Calibration could not be completed.',
        );
      }
    }

    void completeCalibration();

    return () => {
      cancelled = true;
    };
  }, [calibration, captureState, preferredSensitivity, samples]);

  const progressPercentage = Math.min(
    (samples.length / CALIBRATION_TARGET_SAMPLE_COUNT) * 100,
    100,
  );
  const calibrationSummary = calibration.profile
    ? formatCalibrationSummary(calibration.profile)
    : null;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Milestone 3"
        title="Personal calibration is now part of onboarding"
        description="This flow captures a short stable sample of your natural upright desk posture, computes a baseline locally, and stores derived thresholds on your device for later posture classification."
      />

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
            <h2 className="font-display text-xl text-white">
              Calibration checklist
            </h2>
            <ol className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
              <li>
                Start the camera and sit in your natural upright desk posture.
              </li>
              <li>
                Keep your shoulders and hips visible until the pose becomes
                reliable.
              </li>
              <li>
                Run the capture for a short stable sample so the app can build
                your baseline.
              </li>
            </ol>

            <div className="mt-6 space-y-4">
              <label className="block space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.24em] text-accent-300">
                  Sensitivity
                </span>
                <CustomSelect
                  value={preferredSensitivity}
                  options={[
                    { label: 'Low', value: 'low' },
                    { label: 'Medium', value: 'medium' },
                    { label: 'High', value: 'high' },
                  ]}
                  onChange={(nextValue) => {
                    setPreferredSensitivity(nextValue as CalibrationProfile['preferredSensitivity']);
                  }}
                  disabled={
                    captureState === 'capturing' || captureState === 'saving'
                  }
                />
              </label>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  className="rounded-full bg-accent-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-accent-300"
                  onClick={() => {
                    void camera.startCamera(
                      camera.selectedDeviceId || undefined,
                    );
                  }}
                  disabled={!camera.isSupported}
                >
                  Start camera
                </button>
                <button
                  type="button"
                  className="rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                  onClick={() => {
                    startCapture();
                  }}
                  disabled={
                    !streamReady ||
                    captureState === 'capturing' ||
                    captureState === 'saving'
                  }
                >
                  Start calibration
                </button>
                <button
                  type="button"
                  className="rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                  onClick={() => {
                    resetCapture('idle', 'Calibration capture cleared.');
                  }}
                  disabled={captureState === 'saving'}
                >
                  Reset capture
                </button>
              </div>

              <div className="space-y-2">
                <div className="h-3 overflow-hidden rounded-full bg-slate-900">
                  <div
                    className="h-full rounded-full bg-accent-400 transition-all"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
                <p className="text-sm text-slate-300">
                  {samples.length} / {CALIBRATION_TARGET_SAMPLE_COUNT} stable
                  samples collected
                </p>
              </div>

              <p className="text-sm text-slate-300">
                Pose ready for calibration:{' '}
                <span className="font-semibold text-white">
                  {isCaptureReady ? 'yes' : 'not yet'}
                </span>
              </p>
              {message ? (
                <p className="text-sm text-accent-300">{message}</p>
              ) : null}
              {camera.error ? (
                <p className="text-sm text-orange-200">{camera.error}</p>
              ) : null}
            </div>
          </article>

          <article className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-panel">
            <h2 className="font-display text-xl text-white">Live readiness</h2>
            <dl className="mt-4 space-y-3 text-sm text-slate-300">
              <MetricRow label="Camera status" value={camera.status} />
              <MetricRow
                label="Worker status"
                value={poseStream.workerState.phase}
              />
              <MetricRow
                label="Reliable posture signal"
                value={
                  processedPose?.features.isConfidenceSufficient ? 'yes' : 'no'
                }
              />
              <MetricRow
                label="Missing torso anchors"
                value={
                  processedPose?.confidence.missingRequiredKeypoints.length
                    ? processedPose.confidence.missingRequiredKeypoints.join(
                        ', ',
                      )
                    : 'none'
                }
              />
            </dl>
          </article>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        <article className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-panel backdrop-blur">
          <h2 className="font-display text-xl text-white">Saved calibration</h2>
          {calibration.isLoading ? (
            <p className="mt-4 text-sm text-slate-300">
              Loading saved calibration...
            </p>
          ) : calibration.profile ? (
            <dl className="mt-4 space-y-3 text-sm text-slate-300">
              <MetricRow
                label="Last updated"
                value={new Date(calibration.profile.updatedAt).toLocaleString()}
              />
              <MetricRow
                label="Sensitivity"
                value={calibration.profile.preferredSensitivity}
              />
              <MetricRow
                label="Samples"
                value={String(calibration.profile.sampleCount)}
              />
              <MetricRow
                label="Baseline trunk"
                value={`${calibration.profile.baselineTrunkAngle.toFixed(2)} deg`}
              />
              <MetricRow
                label="Baseline head offset"
                value={`${calibration.profile.baselineHeadOffset.toFixed(3)} norm`}
              />
              <div className="pt-3">
                <button
                  type="button"
                  className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                  onClick={() => {
                    void calibration.clear();
                    resetCapture('idle', 'Saved calibration cleared.');
                  }}
                >
                  Clear saved calibration
                </button>
              </div>
            </dl>
          ) : (
            <p className="mt-4 text-sm leading-6 text-slate-300">
              No saved calibration yet. Complete one short capture to create
              your personal baseline.
            </p>
          )}
        </article>

        <article className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-panel">
          <h2 className="font-display text-xl text-white">
            Derived thresholds
          </h2>
          {calibration.profile && calibrationSummary ? (
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <ThresholdCard
                label="Mild slouch threshold"
                value={`${calibration.profile.mildSlouchThreshold.toFixed(2)} deg`}
                detail={`Baseline + ${calibrationSummary.mildSlouchDelta.toFixed(2)} deg`}
              />
              <ThresholdCard
                label="Deep slouch threshold"
                value={`${calibration.profile.deepSlouchThreshold.toFixed(2)} deg`}
                detail={`Baseline + ${calibrationSummary.deepSlouchDelta.toFixed(2)} deg`}
              />
              <ThresholdCard
                label="Head offset warning"
                value={`${calibration.profile.headOffsetWarningThreshold.toFixed(3)} norm`}
                detail={`Baseline + ${calibrationSummary.headOffsetDelta.toFixed(3)}`}
              />
            </div>
          ) : (
            <p className="mt-4 text-sm leading-6 text-slate-300">
              Derived thresholds will appear here after calibration is saved
              locally.
            </p>
          )}
        </article>
      </section>
    </div>
  );

  function startCapture() {
    lastCapturedTimestampRef.current = null;
    setSamples([]);
    setCaptureState('capturing');
    setMessage(
      'Hold still in your natural upright posture while samples are collected.',
    );
  }

  function resetCapture(
    nextState: 'idle' | 'completed' | 'error',
    nextMessage: string | null,
  ) {
    lastCapturedTimestampRef.current = null;
    setSamples([]);
    setCaptureState(nextState);
    setMessage(nextMessage);
  }
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

type ThresholdCardProps = {
  label: string;
  value: string;
  detail: string;
};

function ThresholdCard({ label, value, detail }: ThresholdCardProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent-300">
        {label}
      </p>
      <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-sm text-slate-400">{detail}</p>
    </div>
  );
}
