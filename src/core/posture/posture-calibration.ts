import { median } from '@/utils/math';
import type { CalibrationProfile } from '@/types/domain';

export const CALIBRATION_TARGET_SAMPLE_COUNT = 72;

export type CalibrationSample = {
  timestamp: number;
  trunkAngleDeg: number;
  headForwardOffset: number;
  shoulderTiltDeg: number;
  torsoLength: number;
};

const SENSITIVITY_CONFIG = {
  low: {
    mildSlouchDelta: 12,
    deepSlouchDelta: 20,
    headOffsetDelta: 0.28,
    shoulderTiltDelta: 7,
    confidenceThreshold: 0.3,
  },
  medium: {
    mildSlouchDelta: 8,
    deepSlouchDelta: 15,
    headOffsetDelta: 0.22,
    shoulderTiltDelta: 5,
    confidenceThreshold: 0.35,
  },
  high: {
    mildSlouchDelta: 5,
    deepSlouchDelta: 10,
    headOffsetDelta: 0.16,
    shoulderTiltDelta: 3,
    confidenceThreshold: 0.4,
  },
} as const;

export function buildCalibrationProfile(options: {
  samples: CalibrationSample[];
  preferredSensitivity: CalibrationProfile['preferredSensitivity'];
  existingId?: string;
  now?: number;
}): CalibrationProfile {
  const { samples, preferredSensitivity, existingId, now = Date.now() } = options;

  if (samples.length === 0) {
    throw new Error('Calibration requires at least one valid sample.');
  }

  const sensitivityConfig = SENSITIVITY_CONFIG[preferredSensitivity];
  const baselineTrunkAngle = median(samples.map((sample) => sample.trunkAngleDeg));
  const baselineHeadOffset = median(samples.map((sample) => sample.headForwardOffset));
  const baselineShoulderLevelDelta = median(samples.map((sample) => sample.shoulderTiltDeg));
  const torsoLength = median(samples.map((sample) => sample.torsoLength));

  return {
    id: existingId ?? `calibration-${now}`,
    createdAt: now,
    updatedAt: now,
    baselineTrunkAngle,
    baselineHeadOffset,
    baselineShoulderLevelDelta,
    torsoLength,
    preferredSensitivity,
    confidenceThreshold: sensitivityConfig.confidenceThreshold,
    mildSlouchThreshold: baselineTrunkAngle + sensitivityConfig.mildSlouchDelta,
    deepSlouchThreshold: baselineTrunkAngle + sensitivityConfig.deepSlouchDelta,
    headOffsetWarningThreshold: baselineHeadOffset + sensitivityConfig.headOffsetDelta,
    shoulderTiltWarningThreshold:
      Math.abs(baselineShoulderLevelDelta) + sensitivityConfig.shoulderTiltDelta,
    sampleCount: samples.length,
  };
}

export function formatCalibrationSummary(profile: CalibrationProfile) {
  return {
    mildSlouchDelta: profile.mildSlouchThreshold - profile.baselineTrunkAngle,
    deepSlouchDelta: profile.deepSlouchThreshold - profile.baselineTrunkAngle,
    headOffsetDelta: profile.headOffsetWarningThreshold - profile.baselineHeadOffset,
    shoulderTiltDelta:
      profile.shoulderTiltWarningThreshold - Math.abs(profile.baselineShoulderLevelDelta),
  };
}
