import type { PoseKeypoint } from '@/types/domain';
import type { PoseWorkerBackend, PoseWorkerPhase } from '@/core/inference/inference.types';

export type PoseWorkerInitMessage = {
  type: 'INIT';
  payload: {
    preferredBackend: PoseWorkerBackend;
  };
};

export type PoseWorkerEstimateMessage = {
  type: 'ESTIMATE_POSE';
  payload: {
    frameId: number;
    image: ImageBitmap;
    timestamp: number;
    width: number;
    height: number;
  };
};

export type PoseWorkerDisposeMessage = {
  type: 'DISPOSE';
};

export type PoseWorkerRequest =
  | PoseWorkerInitMessage
  | PoseWorkerEstimateMessage
  | PoseWorkerDisposeMessage;

export type PoseWorkerStatusMessage = {
  type: 'STATUS';
  payload: {
    phase: PoseWorkerPhase;
    backend: PoseWorkerBackend | null;
    modelName?: string;
    detail?: string;
  };
};

export type PoseWorkerReadyMessage = {
  type: 'READY';
  payload: {
    backend: PoseWorkerBackend;
    modelName: string;
  };
};

export type PoseWorkerResultMessage = {
  type: 'POSE_RESULT';
  payload: {
    frameId: number;
    timestamp: number;
    width: number;
    height: number;
    backend: PoseWorkerBackend;
    inferenceTimeMs: number;
    overallScore: number;
    keypoints: PoseKeypoint[];
  };
};

export type PoseWorkerErrorMessage = {
  type: 'ERROR';
  payload: {
    message: string;
  };
};

export type PoseWorkerResponse =
  | PoseWorkerStatusMessage
  | PoseWorkerReadyMessage
  | PoseWorkerResultMessage
  | PoseWorkerErrorMessage;
