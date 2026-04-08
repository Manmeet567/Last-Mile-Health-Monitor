import { computePostureFeatures } from '@/core/posture/posture-features';
import { assessPoseConfidence } from '@/core/processing/confidence-gating';
import { normalizePoseFrame } from '@/core/processing/keypoint-normalizer';
import type { PoseFrame, PoseKeypoint } from '@/types/domain';

function createPoseFrame(keypoints: PoseKeypoint[], overallScore = 0.95): PoseFrame {
  return {
    timestamp: 1_710_000_000_000,
    overallScore,
    keypoints,
  };
}

function createKeypoint(name: string, x: number, y: number, score = 0.99): PoseKeypoint {
  return { name, x, y, score };
}

describe('processing pipeline utilities', () => {
  it('marks a pose unreliable when required torso anchors are missing', () => {
    const pose = createPoseFrame([
      createKeypoint('left_shoulder', 100, 100, 0.9),
      createKeypoint('right_shoulder', 200, 100, 0.9),
      createKeypoint('left_hip', 110, 220, 0.2),
      createKeypoint('right_hip', 190, 220, 0.9),
    ]);

    const result = assessPoseConfidence(pose, { keypointThreshold: 0.3, minPoseScore: 0.5 });

    expect(result.isPoseReliable).toBe(false);
    expect(result.missingRequiredKeypoints).toContain('left_hip');
    expect(result.reliableKeypoints).toHaveLength(3);
  });

  it('normalizes keypoints around torso anchors using torso length', () => {
    const pose = createPoseFrame([
      createKeypoint('left_shoulder', 0, 0),
      createKeypoint('right_shoulder', 2, 0),
      createKeypoint('left_hip', 0, 2),
      createKeypoint('right_hip', 2, 2),
      createKeypoint('nose', 1, -1),
    ]);

    const normalized = normalizePoseFrame(pose.timestamp, pose.overallScore, pose.keypoints);
    const normalizedLeftShoulder = normalized?.keypoints.find((keypoint) => keypoint.name === 'left_shoulder');
    const normalizedNose = normalized?.keypoints.find((keypoint) => keypoint.name === 'nose');

    expect(normalized).not.toBeNull();
    expect(normalized?.anchors.torsoLength).toBeCloseTo(2);
    expect(normalizedLeftShoulder?.x).toBeCloseTo(-0.5);
    expect(normalizedLeftShoulder?.y).toBeCloseTo(0.5);
    expect(normalizedNose?.x).toBeCloseTo(0);
    expect(normalizedNose?.y).toBeCloseTo(1);
  });

  it('extracts stable first-pass posture features from a normalized pose', () => {
    const pose = createPoseFrame([
      createKeypoint('left_shoulder', 0, 0),
      createKeypoint('right_shoulder', 2, 0),
      createKeypoint('left_hip', 0, 2),
      createKeypoint('right_hip', 2, 2),
      createKeypoint('nose', 1, -1),
      createKeypoint('left_ear', 0.5, -0.8),
      createKeypoint('right_ear', 1.5, -0.8),
    ]);

    const normalized = normalizePoseFrame(pose.timestamp, pose.overallScore, pose.keypoints);
    const features = computePostureFeatures(normalized, null, true);

    expect(features.isConfidenceSufficient).toBe(true);
    expect(features.trunkAngleDeg).toBeCloseTo(0);
    expect(features.shoulderTiltDeg).toBeCloseTo(0);
    expect(features.headForwardOffset).toBeCloseTo(0);
    expect(features.shoulderProtractionProxy).toBeCloseTo(1);
    expect(features.movementMagnitude).toBeNull();
  });
});
