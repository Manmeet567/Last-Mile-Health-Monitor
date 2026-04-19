import type { ReactNode, RefObject } from 'react';
import type { PoseInferenceSnapshot, PoseWorkerState } from '@/core/inference/inference.types';
import type { FrameQualityState } from '@/core/processing/processing.types';
import type { PoseWorkerDisplayState } from '@/core/inference/worker-display-state';
import { PoseOverlay } from '@/components/overlays/pose-overlay';

type CameraPreviewProps = {
  children?: ReactNode;
  frameQualityState?: FrameQualityState | null;
  videoRef: RefObject<HTMLVideoElement | null>;
  pose: PoseInferenceSnapshot | null;
  showStatusPills?: boolean;
  workerState: PoseWorkerState;
  workerDisplayState: PoseWorkerDisplayState;
  streamReady: boolean;
};

export function CameraPreview({
  children,
  frameQualityState = null,
  videoRef,
  pose,
  showStatusPills = true,
  workerState,
  workerDisplayState,
  streamReady,
}: CameraPreviewProps) {
  return (
    <div className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-950/80 shadow-panel">
      {showStatusPills ? (
        <div className="absolute left-4 top-4 z-10 flex flex-wrap gap-2">
          <StatusPill label={workerDisplayState.workerLabel} tone={workerDisplayState.tone} />
          <StatusPill label={workerDisplayState.backendLabel} tone="neutral" />
          <StatusPill label={streamReady ? 'Camera: live' : 'Camera: idle'} tone={streamReady ? 'good' : 'neutral'} />
        </div>
      ) : null}

      <div className="relative aspect-video bg-slate-900">
        <video
          ref={videoRef as RefObject<HTMLVideoElement>}
          className="h-full w-full object-contain"
          autoPlay
          muted
          playsInline
        />

        {streamReady ? (
          <PoseOverlay pose={pose} frameQualityState={frameQualityState ?? 'GOOD'} />
        ) : null}

        {children ? <div className="absolute inset-0 z-20">{children}</div> : null}

        {!streamReady ? (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60 p-6">
            <div className="relative flex w-full max-w-sm flex-col items-center justify-center rounded-[26px] border border-white/10 bg-slate-950/58 px-6 py-8 text-center text-sm leading-6 text-slate-300 backdrop-blur-sm">
              <div className="pointer-events-none absolute inset-5 rounded-[22px] border border-dashed border-white/10" />
              <div className="relative flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-200">
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
                  <path d="M4 7a3 3 0 0 1 3-3h2" />
                  <path d="M20 7a3 3 0 0 0-3-3h-2" />
                  <path d="M4 17a3 3 0 0 0 3 3h2" />
                  <path d="M20 17a3 3 0 0 1-3 3h-2" />
                  <rect x="8" y="8" width="8" height="8" rx="2" />
                </svg>
              </div>
              <p className="relative mt-4 text-base font-semibold text-slate-100">
                Start the camera to begin posture tracking.
              </p>
              <p className="relative mt-2 max-w-xs text-sm leading-6 text-slate-400">
                Keep your head and shoulders inside the frame for the most stable view.
              </p>
            </div>
          </div>
        ) : null}

        {workerState.error ? (
          <div className="absolute bottom-4 left-4 right-4 rounded-2xl border border-orange-400/30 bg-slate-950/80 px-4 py-3 text-sm text-orange-100">
            {workerState.error}
          </div>
        ) : null}
      </div>
    </div>
  );
}

type StatusPillProps = {
  label: string;
  tone: 'good' | 'alert' | 'neutral';
};

function StatusPill({ label, tone }: StatusPillProps) {
  const toneClassName =
    tone === 'good'
      ? 'border-emerald-400/40 bg-emerald-400/15 text-emerald-200'
      : tone === 'alert'
        ? 'border-orange-400/40 bg-orange-400/15 text-orange-200'
        : 'border-white/10 bg-slate-950/70 text-slate-200';

  return (
    <div className={`rounded-full border px-3 py-1 text-xs font-semibold tracking-[0.18em] ${toneClassName}`}>
      {label}
    </div>
  );
}
