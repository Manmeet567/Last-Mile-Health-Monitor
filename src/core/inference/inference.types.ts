import type { PoseFrame } from '@/types/domain';

export type PoseWorkerBackend = 'wasm' | 'cpu';

export type PoseWorkerPhase =
  | 'IDLE'
  | 'BOOTING'
  | 'LOADING_MODEL'
  | 'READY'
  | 'INFERRING'
  | 'DISPOSING'
  | 'ERROR';

export type PoseWorkerLifecycle = 'idle' | 'initializing' | 'ready' | 'running' | 'error';

export type PoseInferenceSnapshot = PoseFrame & {
  width: number;
  height: number;
  backend: PoseWorkerBackend;
  inferenceTimeMs: number;
};

export type PoseWorkerState = {
  lifecycle: PoseWorkerLifecycle;
  phase: PoseWorkerPhase;
  backend: PoseWorkerBackend | null;
  error: string | null;
  modelName: string | null;
  lastUpdatedAt: number | null;
};
