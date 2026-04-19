import type { PoseFrame } from '@/types/domain';
import type {
  ConfidenceAssessment,
  FrameQualityAssessment,
} from '@/core/processing/processing.types';
import { midpoint } from '@/core/processing/geometry';

export function assessFrameQuality(
  pose: PoseFrame & { width?: number; height?: number },
  confidence: ConfidenceAssessment,
): FrameQualityAssessment {
  const reliableMap = new Map(
    confidence.reliableKeypoints.map((keypoint) => [keypoint.name, keypoint]),
  );
  const nose = reliableMap.get('nose');
  const leftEar = reliableMap.get('left_ear');
  const rightEar = reliableMap.get('right_ear');
  const leftShoulder = reliableMap.get('left_shoulder');
  const rightShoulder = reliableMap.get('right_shoulder');
  const leftHip = reliableMap.get('left_hip');
  const rightHip = reliableMap.get('right_hip');

  const shouldersVisible = Boolean(leftShoulder && rightShoulder);
  const headVisible = Boolean(nose || leftEar || rightEar);
  const hasHeadAndShoulders = headVisible && shouldersVisible;
  const hipCount = [leftHip, rightHip].filter(Boolean).length;
  const hasTorsoContext = shouldersVisible && hipCount > 0;

  const width = pose.width ?? null;
  const shoulderCenter =
    leftShoulder && rightShoulder ? midpoint(leftShoulder, rightShoulder) : null;
  const anchorX = nose?.x ?? shoulderCenter?.x ?? null;
  const shoulderCenteredEnough =
    width === null || shoulderCenter === null
      ? true
      : shoulderCenter.x >= width * 0.2 && shoulderCenter.x <= width * 0.8;
  const headCenteredEnough =
    width === null || anchorX === null
      ? true
      : anchorX >= width * 0.2 && anchorX <= width * 0.8;
  const isCentered = shoulderCenteredEnough && headCenteredEnough;

  const upperBodyScore = hasHeadAndShoulders ? 1 : shouldersVisible || headVisible ? 0.55 : 0;
  const torsoContextScore =
    hipCount === 2 ? 1 : hipCount === 1 ? 0.62 : shouldersVisible ? 0.22 : 0;
  const centeredScore = isCentered ? 1 : anchorX === null ? 0.45 : 0.28;
  const stableConfidenceScore = clamp(
    (pose.overallScore - confidence.minPoseScore) / 0.45,
    0,
    1,
  );
  const reliableDensityScore = clamp(
    confidence.reliableKeypoints.length / 7,
    0,
    1,
  );

  const score = roundToTwoDecimals(
    upperBodyScore * 0.33 +
      torsoContextScore * 0.27 +
      centeredScore * 0.18 +
      stableConfidenceScore * 0.12 +
      reliableDensityScore * 0.1,
  );

  const state =
    score >= 0.78 && hasHeadAndShoulders && hipCount === 2
      ? 'GOOD'
      : score >= 0.48 && (shouldersVisible || headVisible)
        ? 'LIMITED'
        : 'POOR';

  return {
    state,
    score,
    hasHeadAndShoulders,
    hasTorsoContext,
    isCentered,
    usableForClassification: state !== 'POOR' && hasHeadAndShoulders && hipCount > 0,
    cautiousClassification: state === 'LIMITED',
    guidanceMessage: getGuidanceMessage({
      shouldersVisible,
      hasTorsoContext,
      isCentered,
      state,
    }),
  };
}

function getGuidanceMessage(options: {
  shouldersVisible: boolean;
  hasTorsoContext: boolean;
  isCentered: boolean;
  state: FrameQualityAssessment['state'];
}) {
  if (!options.shouldersVisible) {
    return 'Adjust your position so your shoulders are clearly visible.';
  }

  if (!options.hasTorsoContext) {
    return 'Move slightly back so your upper torso stays visible.';
  }

  if (!options.isCentered) {
    return 'Keep your head and shoulders centered in frame.';
  }

  if (options.state === 'LIMITED') {
    return 'Hold still and keep your upper torso clearly in frame.';
  }

  return null;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function roundToTwoDecimals(value: number) {
  return Math.round(value * 100) / 100;
}
