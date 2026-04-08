import type { PoseKeypoint, PostureFeatures } from '@/types/domain';
import {
  degreesFromHorizontal,
  degreesFromVertical,
  distanceBetween,
  mapKeypointsByName,
  midpoint,
} from '@/core/processing/geometry';
import type { NormalizedPoseFrame } from '@/core/processing/processing.types';

const MOVEMENT_KEYPOINTS = [
  'nose',
  'left_shoulder',
  'right_shoulder',
  'left_hip',
  'right_hip',
  'left_ear',
  'right_ear',
] as const;

export function computePostureFeatures(
  normalizedPose: NormalizedPoseFrame | null,
  previousNormalizedPose: NormalizedPoseFrame | null,
  isConfidenceSufficient: boolean,
  timestamp = Date.now(),
): PostureFeatures {
  if (!normalizedPose) {
    return {
      timestamp,
      trunkAngleDeg: null,
      headForwardOffset: null,
      shoulderTiltDeg: null,
      shoulderProtractionProxy: null,
      movementMagnitude: null,
      isConfidenceSufficient: false,
    };
  }

  const keypointMap = mapKeypointsByName(normalizedPose.keypoints);
  const leftShoulder = keypointMap.get('left_shoulder');
  const rightShoulder = keypointMap.get('right_shoulder');
  const leftHip = keypointMap.get('left_hip');
  const rightHip = keypointMap.get('right_hip');
  const nose = keypointMap.get('nose');

  const midShoulder = leftShoulder && rightShoulder ? midpoint(leftShoulder, rightShoulder) : null;
  const midHip = leftHip && rightHip ? midpoint(leftHip, rightHip) : null;

  const trunkAngleDeg =
    midShoulder && midHip ? degreesFromVertical(midShoulder.x - midHip.x, midShoulder.y - midHip.y) : null;
  const shoulderTiltDeg =
    leftShoulder && rightShoulder ? degreesFromHorizontal(leftShoulder, rightShoulder) : null;
  const headForwardOffset = nose && midShoulder ? Math.abs(nose.x - midShoulder.x) : null;
  const shoulderProtractionProxy =
    leftShoulder && rightShoulder ? distanceBetween(leftShoulder, rightShoulder) : null;

  return {
    timestamp: normalizedPose.timestamp,
    trunkAngleDeg,
    headForwardOffset,
    shoulderTiltDeg,
    shoulderProtractionProxy,
    movementMagnitude: computeMovementMagnitude(normalizedPose.keypoints, previousNormalizedPose?.keypoints ?? null),
    isConfidenceSufficient,
  };
}

function computeMovementMagnitude(
  currentKeypoints: PoseKeypoint[],
  previousKeypoints: PoseKeypoint[] | null,
) {
  if (!previousKeypoints) {
    return null;
  }

  const currentMap = mapKeypointsByName(currentKeypoints);
  const previousMap = mapKeypointsByName(previousKeypoints);
  const displacements: number[] = [];

  for (const keypointName of MOVEMENT_KEYPOINTS) {
    const current = currentMap.get(keypointName);
    const previous = previousMap.get(keypointName);

    if (!current || !previous) {
      continue;
    }

    displacements.push(distanceBetween(current, previous));
  }

  if (displacements.length === 0) {
    return null;
  }

  return displacements.reduce((sum, value) => sum + value, 0) / displacements.length;
}
