import type { RefObject } from 'react';
import type { PoseInferenceSnapshot, PoseWorkerState } from '@/core/inference/inference.types';
import type { PoseWorkerDisplayState } from '@/core/inference/worker-display-state';
import { PoseOverlay } from '@/components/overlays/pose-overlay';

type CameraPreviewProps = {
  videoRef: RefObject<HTMLVideoElement | null>;
  pose: PoseInferenceSnapshot | null;
  workerState: PoseWorkerState;
  workerDisplayState: PoseWorkerDisplayState;
  streamReady: boolean;
};

export function CameraPreview({
  videoRef,
  pose,
  workerState,
  workerDisplayState,
  streamReady,
}: CameraPreviewProps) {
  return (
    <div className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-950/80 shadow-panel">
      <div className="absolute left-4 top-4 z-10 flex flex-wrap gap-2">
        <StatusPill label={workerDisplayState.workerLabel} tone={workerDisplayState.tone} />
        <StatusPill label={workerDisplayState.backendLabel} tone="neutral" />
        <StatusPill label={streamReady ? 'Camera: live' : 'Camera: idle'} tone={streamReady ? 'good' : 'neutral'} />
      </div>

      <div className="relative aspect-video bg-slate-900">
        <video
          ref={videoRef as RefObject<HTMLVideoElement>}
          className="h-full w-full object-contain"
          autoPlay
          muted
          playsInline
        />

        {streamReady ? <PoseOverlay pose={pose} /> : null}

        {!streamReady ? (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60 p-6 text-center text-sm leading-6 text-slate-300">
            Start the camera to begin MoveNet pose detection.
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
