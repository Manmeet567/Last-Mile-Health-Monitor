import type { PoseKeypoint } from '@/types/domain';
import { distanceBetween, mapKeypointsByName, midpoint } from '@/core/processing/geometry';
import type { NormalizedPoseFrame, TorsoAnchors } from '@/core/processing/processing.types';

const MIN_TORSO_LENGTH = 0.0001;

export function normalizePoseFrame(
  timestamp: number,
  overallScore: number,
  keypoints: PoseKeypoint[],
): NormalizedPoseFrame | null {
  const keypointMap = mapKeypointsByName(keypoints);
  const leftShoulder = keypointMap.get('left_shoulder');
  const rightShoulder = keypointMap.get('right_shoulder');
  const leftHip = keypointMap.get('left_hip');
  const rightHip = keypointMap.get('right_hip');

  if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) {
    return null;
  }

  const midShoulder = midpoint(leftShoulder, rightShoulder);
  const midHip = midpoint(leftHip, rightHip);
  const origin = midpoint(midShoulder, midHip);
  const torsoLength = Math.max(distanceBetween(midShoulder, midHip), MIN_TORSO_LENGTH);
  const shoulderWidth = distanceBetween(leftShoulder, rightShoulder);

  const anchors: TorsoAnchors = {
    midShoulder,
    midHip,
    origin,
    torsoLength,
    shoulderWidth,
  };

  return {
    timestamp,
    overallScore,
    anchors,
    keypoints: keypoints.map((keypoint) => ({
      ...keypoint,
      x: (keypoint.x - origin.x) / torsoLength,
      y: (origin.y - keypoint.y) / torsoLength,
    })),
  };
}
