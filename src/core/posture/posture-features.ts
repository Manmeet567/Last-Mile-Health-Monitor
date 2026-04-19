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
      earShoulderOffsetRatio: null,
      headForwardRatio: null,
      torsoLeanRatio: null,
      shoulderTiltDeg: null,
      shoulderProtractionProxy: null,
      shoulderCompressionRatio: null,
      shoulderAsymmetryRatio: null,
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
  const leftEar = keypointMap.get('left_ear');
  const rightEar = keypointMap.get('right_ear');

  const midShoulder = leftShoulder && rightShoulder ? midpoint(leftShoulder, rightShoulder) : null;
  const midHip = leftHip && rightHip ? midpoint(leftHip, rightHip) : null;
  const shoulderWidthRatio =
    leftShoulder && rightShoulder ? distanceBetween(leftShoulder, rightShoulder) : null;

  const trunkAngleDeg =
    midShoulder && midHip ? degreesFromVertical(midShoulder.x - midHip.x, midShoulder.y - midHip.y) : null;
  const shoulderTiltDeg =
    leftShoulder && rightShoulder ? degreesFromHorizontal(leftShoulder, rightShoulder) : null;
  const headForwardOffset = nose && midShoulder ? Math.abs(nose.x - midShoulder.x) : null;
  const shoulderProtractionProxy = shoulderWidthRatio;
  const headForwardRatio =
    headForwardOffset !== null && shoulderWidthRatio
      ? headForwardOffset / Math.max(shoulderWidthRatio, 0.0001)
      : null;
  const torsoLeanRatio =
    midShoulder && midHip
      ? Math.abs(midShoulder.x - midHip.x) /
        Math.max(distanceBetween(midShoulder, midHip), 0.0001)
      : null;
  const shoulderCompressionRatio =
    shoulderWidthRatio !== null ? Math.max(1 - shoulderWidthRatio, 0) : null;
  const shoulderAsymmetryRatio =
    leftShoulder && rightShoulder && shoulderWidthRatio
      ? Math.abs(leftShoulder.y - rightShoulder.y) /
        Math.max(shoulderWidthRatio, 0.0001)
      : null;
  const earShoulderOffsetRatio = computeEarShoulderOffsetRatio({
    leftEar,
    rightEar,
    leftShoulder,
    rightShoulder,
    shoulderWidthRatio,
  });

  return {
    timestamp: normalizedPose.timestamp,
    trunkAngleDeg,
    headForwardOffset,
    earShoulderOffsetRatio,
    headForwardRatio,
    torsoLeanRatio,
    shoulderTiltDeg,
    shoulderProtractionProxy,
    shoulderCompressionRatio,
    shoulderAsymmetryRatio,
    movementMagnitude: computeMovementMagnitude(normalizedPose.keypoints, previousNormalizedPose?.keypoints ?? null),
    isConfidenceSufficient,
  };
}

function computeEarShoulderOffsetRatio(options: {
  leftEar: PoseKeypoint | undefined;
  rightEar: PoseKeypoint | undefined;
  leftShoulder: PoseKeypoint | undefined;
  rightShoulder: PoseKeypoint | undefined;
  shoulderWidthRatio: number | null;
}) {
  const {
    leftEar,
    rightEar,
    leftShoulder,
    rightShoulder,
    shoulderWidthRatio,
  } = options;

  if (!shoulderWidthRatio) {
    return null;
  }

  const offsets: number[] = [];

  if (leftEar && leftShoulder) {
    offsets.push(Math.abs(leftEar.x - leftShoulder.x));
  }

  if (rightEar && rightShoulder) {
    offsets.push(Math.abs(rightEar.x - rightShoulder.x));
  }

  if (offsets.length === 0) {
    return null;
  }

  return (
    offsets.reduce((sum, value) => sum + value, 0) /
    offsets.length /
    Math.max(shoulderWidthRatio, 0.0001)
  );
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
