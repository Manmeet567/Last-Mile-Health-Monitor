import type { RefObject } from 'react';
import { CameraPreview } from '@/components/camera/camera-preview';
import { CustomSelect } from '@/components/common/custom-select';
import type { CameraDevice } from '@/core/camera/camera.types';
import type { PoseInferenceSnapshot, PoseWorkerState } from '@/core/inference/inference.types';
import type { FrameQualityState } from '@/core/processing/processing.types';
import type { PoseWorkerDisplayState } from '@/core/inference/worker-display-state';

type CameraCardProps = {
  cameraDevices: CameraDevice[];
  cameraError: string | null;
  currentPostureLabel: string;
  frameQualityState?: FrameQualityState | null;
  onCameraChange: (deviceId: string) => void;
  onStartCamera: () => void;
  onStopCamera: () => void;
  overlayState: SimplifiedOverlayState;
  overlaySubtitle: string;
  pose: PoseInferenceSnapshot | null;
  selectedDeviceId: string;
  stableDurationLabel: string;
  streamReady: boolean;
  videoRef: RefObject<HTMLVideoElement | null>;
  workerDisplayState: PoseWorkerDisplayState;
  workerState: PoseWorkerState;
  sessionDurationLabel: string;
  startDisabled?: boolean;
};

export type SimplifiedOverlayState = 'no-person' | 'detecting' | 'good' | 'bad';

export function CameraCard({
  cameraDevices,
  cameraError,
  currentPostureLabel,
  frameQualityState = null,
  onCameraChange,
  onStartCamera,
  onStopCamera,
  overlayState,
  overlaySubtitle,
  pose,
  selectedDeviceId,
  stableDurationLabel,
  streamReady,
  videoRef,
  workerDisplayState,
  workerState,
  sessionDurationLabel,
  startDisabled = false,
}: CameraCardProps) {
  const overlayTone = overlayToneByState[overlayState];

  return (
    <article className="rounded-[2rem] border border-white/10 bg-slate-950/75 p-5 shadow-panel">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent-300">
            Live posture
          </p>
          <h2 className="mt-1.5 text-[1.45rem] font-semibold tracking-[-0.03em] text-white">
            Camera-centered posture tracking
          </h2>
        </div>
        <div className="flex flex-wrap justify-end gap-2 pt-0.5">
          <TopBadge label={`Session ${sessionDurationLabel}`} />
          <TopBadge label={`Stable ${stableDurationLabel}`} />
        </div>
      </div>

      <div className="mt-5">
        <CameraPreview
          frameQualityState={frameQualityState}
          videoRef={videoRef}
          pose={pose}
          workerState={workerState}
          workerDisplayState={workerDisplayState}
          streamReady={streamReady}
          showStatusPills={false}
        >
          <div className="flex h-full items-center justify-center p-6">
            <div
              className={[
                'max-w-md rounded-[24px] border px-5 py-4 text-center shadow-[0_18px_60px_-32px_rgba(2,6,23,0.95)] backdrop-blur-sm transition-all duration-300 ease-in-out',
                overlayTone.containerClassName,
              ].join(' ')}
            >
              <p className={['text-[1.2rem] font-semibold tracking-[-0.02em]', overlayTone.titleClassName].join(' ')}>
                {overlayTone.title}
              </p>
              <p className="mt-2 text-sm leading-6 text-current/85">
                {overlaySubtitle}
              </p>
            </div>
          </div>
        </CameraPreview>
      </div>

      <div className="mt-4 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <label className="block min-w-0 flex-1 space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.22em] text-accent-300">
            Camera
          </span>
          <CustomSelect
            value={selectedDeviceId}
            options={
              cameraDevices.length === 0
                ? [{ label: 'No camera detected yet', value: '' }]
                : cameraDevices.map((device) => ({
                    label: device.label,
                    value: device.deviceId,
                  }))
            }
            onChange={(nextValue) => {
              onCameraChange(nextValue);
            }}
            placeholder="Choose a camera"
            disabled={cameraDevices.length === 0}
          />
        </label>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="rounded-full bg-accent-300 px-5 py-3 text-sm font-semibold text-slate-950 transition-all duration-200 ease-in-out hover:-translate-y-[1px] hover:bg-accent-200 active:scale-[0.98]"
            onClick={onStartCamera}
            disabled={startDisabled}
          >
            Start camera
          </button>
          <button
            type="button"
            className="rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-white transition-all duration-200 ease-in-out hover:-translate-y-[1px] hover:bg-white/10 active:scale-[0.98]"
            onClick={onStopCamera}
          >
            Stop camera
          </button>
        </div>
      </div>

      <div className="mt-3.5 flex flex-wrap items-center gap-3 text-sm text-slate-300">
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-200">
          {streamReady ? 'Camera live' : 'Camera idle'}
        </span>
        <span className="text-sm text-slate-400">{currentPostureLabel}</span>
      </div>

      {cameraError ? (
        <p className="mt-4 rounded-2xl border border-orange-400/20 bg-orange-400/10 px-4 py-3 text-sm text-orange-100">
          {cameraError}
        </p>
      ) : null}
    </article>
  );
}

function TopBadge({ label }: { label: string }) {
  return (
    <div className="rounded-full border border-white/10 bg-slate-950/72 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-300">
      {label}
    </div>
  );
}

const overlayToneByState: Record<
  SimplifiedOverlayState,
  {
    containerClassName: string;
    title: string;
    titleClassName: string;
  }
> = {
  'no-person': {
    containerClassName:
      'border-white/10 bg-slate-950/72 text-slate-100',
    title: 'No one detected. Sit in front of the camera.',
    titleClassName: 'text-slate-100',
  },
  detecting: {
    containerClassName:
      'border-amber-300/30 bg-amber-400/12 text-amber-100',
    title: 'Detecting posture...',
    titleClassName: 'text-amber-100',
  },
  good: {
    containerClassName:
      'border-emerald-300/30 bg-emerald-400/14 text-emerald-100',
    title: 'Good posture. Keep it up.',
    titleClassName: 'text-emerald-100',
  },
  bad: {
    containerClassName:
      'border-rose-300/30 bg-rose-400/14 text-rose-100',
    title: 'Slouch detected. Straighten your back.',
    titleClassName: 'text-rose-100',
  },
};
