import type { PoseModelVariant } from '@/core/inference/inference.types';

export const DEFAULT_TARGET_INFERENCE_FPS = 12;
export const DEFAULT_KEYPOINT_SCORE_THRESHOLD = 0.3;
export const DEFAULT_MIN_POSE_SCORE = 0.2;
export const POSE_MODEL_VARIANT_STORAGE_KEY = 'last-mile:pose-model-variant';
export const DEFAULT_POSE_MODEL_VARIANT: PoseModelVariant = 'lightning';
export const MOVENET_MODEL_NAMES: Record<PoseModelVariant, string> = {
  lightning: 'MoveNet SinglePose Lightning',
  thunder: 'MoveNet Thunder',
};

export function resolvePoseModelVariant(
  value: string | null | undefined,
): PoseModelVariant {
  return value === 'thunder' ? 'thunder' : DEFAULT_POSE_MODEL_VARIANT;
}

export function readPreferredPoseModelVariant(): PoseModelVariant {
  if (typeof window === 'undefined') {
    return DEFAULT_POSE_MODEL_VARIANT;
  }

  return resolvePoseModelVariant(
    window.localStorage.getItem(POSE_MODEL_VARIANT_STORAGE_KEY),
  );
}
