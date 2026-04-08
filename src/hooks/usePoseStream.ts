import { startTransition, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import {
  DEFAULT_MIN_POSE_SCORE,
  DEFAULT_TARGET_INFERENCE_FPS,
  MOVENET_MODEL_NAME,
} from '@/core/inference/inference.constants';
import { shouldScheduleInferenceFrame } from '@/core/inference/frame-scheduler';
import {
  buildPoseWorkerDisplayState,
  type PoseWorkerDisplayState,
} from '@/core/inference/worker-display-state';
import type {
  PoseInferenceSnapshot,
  PoseWorkerBackend,
  PoseWorkerLifecycle,
  PoseWorkerPhase,
  PoseWorkerState,
} from '@/core/inference/inference.types';
import type { PoseWorkerRequest, PoseWorkerResponse } from '@/workers/worker-message.types';

const initialWorkerState: PoseWorkerState = {
  lifecycle: 'idle',
  phase: 'IDLE',
  backend: null,
  error: null,
  modelName: null,
  lastUpdatedAt: null,
};

type UsePoseStreamOptions = {
  enabled: boolean;
  targetFps?: number;
  preferredBackend?: PoseWorkerBackend;
};

type E2EPoseStreamConfig = {
  intervalMs?: number;
  frames: PoseInferenceSnapshot[];
  backend?: PoseWorkerBackend;
};

export function usePoseStream(
  videoRef: RefObject<HTMLVideoElement | null>,
  options: UsePoseStreamOptions,
) {
  const { enabled, targetFps = DEFAULT_TARGET_INFERENCE_FPS, preferredBackend = 'wasm' } = options;
  const mockPoseStreamConfig = getMockPoseStreamConfig();
  const workerRef = useRef<Worker | null>(null);
  const frameRequestRef = useRef<number | null>(null);
  const frameIdRef = useRef(0);
  const lastSubmittedFrameAtRef = useRef(0);
  const inFlightFrameRef = useRef(false);
  const workerStateRef = useRef<PoseWorkerState>(initialWorkerState);
  const [workerState, setWorkerState] = useState<PoseWorkerState>(initialWorkerState);
  const [latestPose, setLatestPose] = useState<PoseInferenceSnapshot | null>(null);

  useEffect(() => {
    if (!enabled) {
      workerStateRef.current = initialWorkerState;
      setWorkerState(initialWorkerState);
      setLatestPose(null);
      return;
    }

    if (mockPoseStreamConfig) {
      const backend = mockPoseStreamConfig.backend ?? 'cpu';
      updateWorkerState({
        lifecycle: 'ready',
        phase: 'READY',
        backend,
        error: null,
        modelName: MOVENET_MODEL_NAME,
        lastUpdatedAt: Date.now(),
      });

      if (mockPoseStreamConfig.frames.length === 0) {
        return;
      }

      let frameIndex = 0;
      const emitFrame = () => {
        const frame = mockPoseStreamConfig.frames[Math.min(frameIndex, mockPoseStreamConfig.frames.length - 1)];
        frameIndex += 1;
        startTransition(() => {
          setLatestPose(frame);
        });
        updateWorkerState({
          lifecycle: 'running',
          phase: 'READY',
          backend: frame.backend,
          error: null,
          modelName: MOVENET_MODEL_NAME,
          lastUpdatedAt: Date.now(),
        });
      };

      emitFrame();
      const intervalId = window.setInterval(emitFrame, mockPoseStreamConfig.intervalMs ?? 180);

      return () => {
        window.clearInterval(intervalId);
      };
    }

    const nextWorker = new Worker(new URL('@/workers/pose.worker.ts', import.meta.url), {
      type: 'module',
    });

    workerRef.current = nextWorker;
    updateWorkerState({
      lifecycle: 'initializing',
      phase: 'BOOTING',
      backend: null,
      error: null,
      modelName: null,
      lastUpdatedAt: Date.now(),
    });

    nextWorker.onmessage = (event: MessageEvent<PoseWorkerResponse>) => {
      const message = event.data;

      if (message.type === 'STATUS') {
        const nextLifecycle = mapLifecycleFromPhase(message.payload.phase);
        const shouldSurfaceStatus =
          message.payload.phase === 'BOOTING' ||
          message.payload.phase === 'LOADING_MODEL' ||
          message.payload.phase === 'DISPOSING' ||
          message.payload.phase === 'ERROR';

        if (!shouldSurfaceStatus) {
          return;
        }

        updateWorkerState({
          lifecycle: nextLifecycle,
          phase: message.payload.phase,
          backend: message.payload.backend,
          modelName: message.payload.modelName ?? workerStateRef.current.modelName,
          error:
            message.payload.phase === 'ERROR'
              ? message.payload.detail ?? 'Inference worker reported an unknown error.'
              : null,
          lastUpdatedAt: Date.now(),
        });
        return;
      }

      if (message.type === 'READY') {
        updateWorkerState({
          lifecycle: 'ready',
          phase: 'READY',
          backend: message.payload.backend,
          modelName: message.payload.modelName,
          error: null,
          lastUpdatedAt: Date.now(),
        });
        return;
      }

      if (message.type === 'POSE_RESULT') {
        inFlightFrameRef.current = false;
        startTransition(() => {
          setLatestPose({
            timestamp: message.payload.timestamp,
            overallScore: message.payload.overallScore,
            keypoints: message.payload.keypoints,
            width: message.payload.width,
            height: message.payload.height,
            backend: message.payload.backend,
            inferenceTimeMs: message.payload.inferenceTimeMs,
          });
        });

        if (
          workerStateRef.current.lifecycle !== 'running' ||
          workerStateRef.current.backend !== message.payload.backend
        ) {
          updateWorkerState({
            lifecycle: 'running',
            phase: 'READY',
            backend: message.payload.backend,
            modelName: workerStateRef.current.modelName || MOVENET_MODEL_NAME,
            error: null,
            lastUpdatedAt: Date.now(),
          });
        }
        return;
      }

      if (message.type === 'ERROR') {
        inFlightFrameRef.current = false;
        updateWorkerState({
          lifecycle: 'error',
          phase: 'ERROR',
          backend: workerStateRef.current.backend,
          modelName: workerStateRef.current.modelName || MOVENET_MODEL_NAME,
          error: message.payload.message,
          lastUpdatedAt: Date.now(),
        });
      }
    };

    nextWorker.onerror = (event) => {
      inFlightFrameRef.current = false;
      updateWorkerState({
        lifecycle: 'error',
        phase: 'ERROR',
        backend: workerStateRef.current.backend,
        modelName: workerStateRef.current.modelName || MOVENET_MODEL_NAME,
        error: event.message || 'The inference worker crashed unexpectedly.',
        lastUpdatedAt: Date.now(),
      });
    };

    nextWorker.postMessage({
      type: 'INIT',
      payload: { preferredBackend },
    } satisfies PoseWorkerRequest);

    return () => {
      if (frameRequestRef.current !== null) {
        cancelAnimationFrame(frameRequestRef.current);
      }

      nextWorker.postMessage({ type: 'DISPOSE' } satisfies PoseWorkerRequest);
      nextWorker.terminate();
      workerRef.current = null;
      inFlightFrameRef.current = false;
    };
  }, [enabled, mockPoseStreamConfig, preferredBackend]);

  useEffect(() => {
    if (mockPoseStreamConfig) {
      return;
    }

    const video = videoRef.current;
    if (!video) {
      return;
    }

    if (!enabled || workerStateRef.current.lifecycle === 'error' || !workerRef.current) {
      return;
    }

    const frameIntervalMs = 1000 / targetFps;

    const processFrame = async (frameTime: number) => {
      frameRequestRef.current = requestAnimationFrame((nextFrameTime) => {
        void processFrame(nextFrameTime);
      });

      if (
        !shouldScheduleInferenceFrame({
          enabled,
          lifecycle: workerStateRef.current.lifecycle,
          documentVisible: document.visibilityState === 'visible',
          readyState: video.readyState,
          frameTime,
          lastSubmittedFrameAt: lastSubmittedFrameAtRef.current,
          frameIntervalMs,
          inFlightFrame: inFlightFrameRef.current,
        })
      ) {
        return;
      }

      if (typeof createImageBitmap !== 'function') {
        updateWorkerState({
          lifecycle: 'error',
          phase: 'ERROR',
          backend: workerStateRef.current.backend,
          modelName: workerStateRef.current.modelName,
          error: 'createImageBitmap is not available in this browser.',
          lastUpdatedAt: Date.now(),
        });
        return;
      }

      try {
        inFlightFrameRef.current = true;
        lastSubmittedFrameAtRef.current = frameTime;
        const bitmap = await createImageBitmap(video);

        workerRef.current?.postMessage(
          {
            type: 'ESTIMATE_POSE',
            payload: {
              frameId: ++frameIdRef.current,
              image: bitmap,
              timestamp: Date.now(),
              width: video.videoWidth,
              height: video.videoHeight,
            },
          } satisfies PoseWorkerRequest,
          [bitmap],
        );
      } catch (error) {
        inFlightFrameRef.current = false;
        updateWorkerState({
          lifecycle: 'error',
          phase: 'ERROR',
          backend: workerStateRef.current.backend,
          modelName: workerStateRef.current.modelName,
          error: error instanceof Error ? error.message : 'Unable to capture the current video frame.',
          lastUpdatedAt: Date.now(),
        });
      }
    };

    frameRequestRef.current = requestAnimationFrame((nextFrameTime) => {
      void processFrame(nextFrameTime);
    });

    return () => {
      if (frameRequestRef.current !== null) {
        cancelAnimationFrame(frameRequestRef.current);
      }
    };
  }, [enabled, mockPoseStreamConfig, targetFps, videoRef]);

  const workerDisplayState = useMemo<PoseWorkerDisplayState>(
    () => buildPoseWorkerDisplayState(workerState),
    [workerState],
  );

  return {
    workerState,
    workerDisplayState,
    latestPose,
    hasPose: latestPose !== null && latestPose.keypoints.length > 0,
    confidenceThreshold: DEFAULT_MIN_POSE_SCORE,
  };

  function updateWorkerState(nextState: PoseWorkerState) {
    const currentState = workerStateRef.current;
    const unchanged =
      currentState.lifecycle === nextState.lifecycle &&
      currentState.phase === nextState.phase &&
      currentState.backend === nextState.backend &&
      currentState.error === nextState.error &&
      currentState.modelName === nextState.modelName;

    if (unchanged) {
      return;
    }

    workerStateRef.current = nextState;
    setWorkerState(nextState);
  }
}

function getMockPoseStreamConfig(): E2EPoseStreamConfig | null {
  const maybeMockConfig = (globalThis as typeof globalThis & {
    __LAST_MILE_E2E_POSE_STREAM__?: E2EPoseStreamConfig;
  }).__LAST_MILE_E2E_POSE_STREAM__;

  return maybeMockConfig ?? null;
}

function mapLifecycleFromPhase(phase: PoseWorkerPhase): PoseWorkerLifecycle {
  if (phase === 'READY') {
    return 'ready';
  }

  if (phase === 'INFERRING') {
    return 'running';
  }

  if (phase === 'ERROR') {
    return 'error';
  }

  if (phase === 'BOOTING' || phase === 'LOADING_MODEL' || phase === 'DISPOSING') {
    return 'initializing';
  }

  return 'idle';
}
