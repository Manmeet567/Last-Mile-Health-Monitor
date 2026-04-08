import type { PoseWorkerLifecycle } from '@/core/inference/inference.types';

export function shouldScheduleInferenceFrame(options: {
  enabled: boolean;
  lifecycle: PoseWorkerLifecycle;
  documentVisible: boolean;
  readyState: number;
  frameTime: number;
  lastSubmittedFrameAt: number;
  frameIntervalMs: number;
  inFlightFrame: boolean;
}) {
  const {
    enabled,
    lifecycle,
    documentVisible,
    readyState,
    frameTime,
    lastSubmittedFrameAt,
    frameIntervalMs,
    inFlightFrame,
  } = options;

  if (!enabled) {
    return false;
  }

  if (lifecycle !== 'ready' && lifecycle !== 'running') {
    return false;
  }

  if (!documentVisible) {
    return false;
  }

  if (readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
    return false;
  }

  if (inFlightFrame) {
    return false;
  }

  if (frameTime - lastSubmittedFrameAt < frameIntervalMs) {
    return false;
  }

  return true;
}
