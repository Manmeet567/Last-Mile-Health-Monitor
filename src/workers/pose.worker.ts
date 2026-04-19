/// <reference lib="webworker" />

import * as poseDetection from '@tensorflow-models/pose-detection';
import '@tensorflow/tfjs-backend-cpu';
import { setWasmPaths } from '@tensorflow/tfjs-backend-wasm';
import '@tensorflow/tfjs-backend-wasm';
import * as tf from '@tensorflow/tfjs-core';
import wasmBinaryPath from '@tensorflow/tfjs-backend-wasm/dist/tfjs-backend-wasm.wasm?url';
import wasmSimdBinaryPath from '@tensorflow/tfjs-backend-wasm/dist/tfjs-backend-wasm-simd.wasm?url';
import wasmThreadedBinaryPath from '@tensorflow/tfjs-backend-wasm/dist/tfjs-backend-wasm-threaded-simd.wasm?url';
import {
  MOVENET_MODEL_NAMES,
  resolvePoseModelVariant,
} from '@/core/inference/inference.constants';
import type {
  PoseModelVariant,
  PoseWorkerBackend,
  PoseWorkerPhase,
} from '@/core/inference/inference.types';
import type { PoseWorkerRequest, PoseWorkerResponse } from '@/workers/worker-message.types';

const workerScope = self as DedicatedWorkerGlobalScope;

let detector: poseDetection.PoseDetector | null = null;
let activeBackend: PoseWorkerBackend = 'cpu';
let activeModelVariant: PoseModelVariant = 'lightning';

workerScope.onmessage = async (event: MessageEvent<PoseWorkerRequest>) => {
  const message = event.data;

  try {
    if (message.type === 'INIT') {
      await initializeDetector(
        message.payload.preferredBackend,
        message.payload.modelVariant,
      );
      return;
    }

    if (message.type === 'ESTIMATE_POSE') {
      await estimatePose(message.payload);
      return;
    }

    if (message.type === 'DISPOSE') {
      postStatus('DISPOSING', activeBackend, 'Tearing down pose worker resources.');
      detector?.dispose();
      detector = null;
      return;
    }
  } catch (error) {
    const messageText = error instanceof Error ? error.message : 'Unknown worker error.';
    postWorkerMessage({
      type: 'ERROR',
      payload: { message: messageText },
    });
    postStatus('ERROR', activeBackend, messageText);
  }
};

async function initializeDetector(
  preferredBackend: PoseWorkerBackend,
  preferredModelVariant: PoseModelVariant,
) {
  postStatus('BOOTING', null, 'Preparing TensorFlow.js runtime.');
  setWasmPaths({
    'tfjs-backend-wasm.wasm': wasmBinaryPath,
    'tfjs-backend-wasm-simd.wasm': wasmSimdBinaryPath,
    'tfjs-backend-wasm-threaded-simd.wasm': wasmThreadedBinaryPath,
  });

  activeBackend = await resolveBackend(preferredBackend);
  activeModelVariant = resolvePoseModelVariant(preferredModelVariant);
  const modelName = MOVENET_MODEL_NAMES[activeModelVariant];
  postStatus('LOADING_MODEL', activeBackend, `Loading ${modelName}.`, modelName);

  detector?.dispose();
  detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, {
    modelType:
      activeModelVariant === 'thunder'
        ? poseDetection.movenet.modelType.SINGLEPOSE_THUNDER
        : poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
    enableSmoothing: true,
  });

  postWorkerMessage({
    type: 'READY',
    payload: {
      backend: activeBackend,
      modelName,
    },
  });
  postStatus('READY', activeBackend, 'MoveNet is ready for inference.', modelName);
}

async function resolveBackend(preferredBackend: PoseWorkerBackend): Promise<PoseWorkerBackend> {
  const candidates: PoseWorkerBackend[] =
    preferredBackend === 'wasm' ? ['wasm', 'cpu'] : [preferredBackend, 'cpu'];

  for (const candidate of candidates) {
    try {
      await tf.setBackend(candidate);
      await tf.ready();
      return candidate;
    } catch {
      continue;
    }
  }

  throw new Error('No compatible TensorFlow.js backend could be initialized.');
}

async function estimatePose(payload: {
  frameId: number;
  image: ImageBitmap;
  timestamp: number;
  width: number;
  height: number;
}) {
  try {
    if (!detector) {
      throw new Error('The pose detector is not ready yet.');
    }

    const inferenceStartedAt = performance.now();
    const poses = await detector.estimatePoses(payload.image, undefined, payload.timestamp);
    const primaryPose = poses[0];
    const keypoints =
      primaryPose?.keypoints.map((keypoint, index) => ({
        name: keypoint.name || `keypoint-${index + 1}`,
        x: keypoint.x,
        y: keypoint.y,
        score: keypoint.score ?? 0,
      })) ?? [];

    const overallScore =
      primaryPose?.score ??
      (keypoints.length > 0
        ? keypoints.reduce((sum, keypoint) => sum + keypoint.score, 0) / keypoints.length
        : 0);

    postWorkerMessage({
      type: 'POSE_RESULT',
      payload: {
        frameId: payload.frameId,
        timestamp: payload.timestamp,
        width: payload.width,
        height: payload.height,
        backend: activeBackend,
        inferenceTimeMs: performance.now() - inferenceStartedAt,
        overallScore,
        keypoints,
      },
    });
  } finally {
    payload.image.close();
  }
}

function postStatus(
  phase: PoseWorkerPhase,
  backend: PoseWorkerBackend | null,
  detail?: string,
  modelName?: string,
) {
  postWorkerMessage({
    type: 'STATUS',
    payload: {
      phase,
      backend,
      detail,
      modelName,
    },
  });
}

function postWorkerMessage(message: PoseWorkerResponse) {
  workerScope.postMessage(message);
}
