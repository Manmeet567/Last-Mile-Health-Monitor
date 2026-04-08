import {
  DEFAULT_KEYPOINT_SCORE_THRESHOLD,
  DEFAULT_MIN_POSE_SCORE,
} from '@/core/inference/inference.constants';
import type { PoseFrame } from '@/types/domain';
import type { ConfidenceAssessment, RequiredPoseKeypointName } from '@/core/processing/processing.types';

export const REQUIRED_TORSO_KEYPOINTS: RequiredPoseKeypointName[] = [
  'left_shoulder',
  'right_shoulder',
  'left_hip',
  'right_hip',
];

export function assessPoseConfidence(
  pose: PoseFrame,
  options?: {
    keypointThreshold?: number;
    minPoseScore?: number;
  },
): ConfidenceAssessment {
  const keypointThreshold = options?.keypointThreshold ?? DEFAULT_KEYPOINT_SCORE_THRESHOLD;
  const minPoseScore = options?.minPoseScore ?? DEFAULT_MIN_POSE_SCORE;
  const reliableKeypoints = pose.keypoints.filter((keypoint) => keypoint.score >= keypointThreshold);
  const rejectedKeypoints = pose.keypoints.filter((keypoint) => keypoint.score < keypointThreshold);
  const reliableNames = new Set(reliableKeypoints.map((keypoint) => keypoint.name));
  const missingRequiredKeypoints = REQUIRED_TORSO_KEYPOINTS.filter((name) => !reliableNames.has(name));
  const hasRequiredTorsoKeypoints = missingRequiredKeypoints.length === 0;

  return {
    timestamp: pose.timestamp,
    overallScore: pose.overallScore,
    keypointThreshold,
    minPoseScore,
    reliableKeypoints,
    rejectedKeypoints,
    missingRequiredKeypoints,
    hasRequiredTorsoKeypoints,
    isPoseReliable: hasRequiredTorsoKeypoints && pose.overallScore >= minPoseScore,
  };
}
