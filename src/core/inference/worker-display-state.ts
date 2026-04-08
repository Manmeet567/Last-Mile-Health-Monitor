import type { PoseWorkerState } from '@/core/inference/inference.types';

export type PoseWorkerDisplayState = {
  workerLabel: string;
  backendLabel: string;
  tone: 'neutral' | 'good' | 'alert';
};

export function buildPoseWorkerDisplayState(workerState: PoseWorkerState): PoseWorkerDisplayState {
  if (workerState.lifecycle === 'error') {
    return {
      workerLabel: 'Worker: error',
      backendLabel: workerState.backend ? `Backend: ${workerState.backend}` : 'Backend: unavailable',
      tone: 'alert',
    };
  }

  if (workerState.lifecycle === 'initializing') {
    return {
      workerLabel:
        workerState.phase === 'LOADING_MODEL' ? 'Worker: loading model' : 'Worker: preparing runtime',
      backendLabel: workerState.backend ? `Backend: ${workerState.backend}` : 'Backend: pending',
      tone: 'neutral',
    };
  }

  if (workerState.lifecycle === 'running') {
    return {
      workerLabel: 'Worker: live analysis',
      backendLabel: workerState.backend ? `Backend: ${workerState.backend}` : 'Backend: pending',
      tone: 'good',
    };
  }

  if (workerState.lifecycle === 'ready') {
    return {
      workerLabel: 'Worker: ready',
      backendLabel: workerState.backend ? `Backend: ${workerState.backend}` : 'Backend: pending',
      tone: 'good',
    };
  }

  return {
    workerLabel: 'Worker: idle',
    backendLabel: workerState.backend ? `Backend: ${workerState.backend}` : 'Backend: pending',
    tone: 'neutral',
  };
}
