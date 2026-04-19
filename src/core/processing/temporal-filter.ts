import type { NormalizedPoseFrame } from '@/core/processing/processing.types';
import type { PoseKeypoint, PostureFeatures } from '@/types/domain';

type KeypointFilterBank = {
  x: OneEuroFilter;
  y: OneEuroFilter;
  score: OneEuroFilter;
};

type LowPassState = {
  rawTimestamp: number;
  filteredValue: number;
  rawValue: number;
};

export class OneEuroFilter {
  private readonly minCutoff: number;
  private readonly beta: number;
  private readonly derivativeCutoff: number;
  private valueState: LowPassState | null = null;
  private derivativeState: LowPassState | null = null;

  constructor(options?: {
    minCutoff?: number;
    beta?: number;
    derivativeCutoff?: number;
  }) {
    this.minCutoff = options?.minCutoff ?? 1.0;
    this.beta = options?.beta ?? 0.03;
    this.derivativeCutoff = options?.derivativeCutoff ?? 1.0;
  }

  filter(value: number, timestampMs: number) {
    if (this.valueState === null || this.derivativeState === null) {
      this.valueState = {
        rawTimestamp: timestampMs,
        filteredValue: value,
        rawValue: value,
      };
      this.derivativeState = {
        rawTimestamp: timestampMs,
        filteredValue: 0,
        rawValue: 0,
      };
      return value;
    }

    const elapsedSeconds = Math.max((timestampMs - this.valueState.rawTimestamp) / 1000, 1 / 120);
    const derivative = (value - this.valueState.rawValue) / elapsedSeconds;
    const smoothedDerivative = lowPass(
      derivative,
      this.derivativeState.filteredValue,
      smoothingFactor(this.derivativeCutoff, elapsedSeconds),
    );
    const cutoff = this.minCutoff + this.beta * Math.abs(smoothedDerivative);
    const filteredValue = lowPass(
      value,
      this.valueState.filteredValue,
      smoothingFactor(cutoff, elapsedSeconds),
    );

    this.derivativeState = {
      rawTimestamp: timestampMs,
      rawValue: derivative,
      filteredValue: smoothedDerivative,
    };
    this.valueState = {
      rawTimestamp: timestampMs,
      rawValue: value,
      filteredValue,
    };

    return filteredValue;
  }

  reset() {
    this.valueState = null;
    this.derivativeState = null;
  }
}

export class PoseSignalSmoother {
  private readonly keypointFilters = new Map<string, KeypointFilterBank>();
  private readonly featureFilters = {
    trunkAngleDeg: new OneEuroFilter({ minCutoff: 0.8, beta: 0.02 }),
    headForwardOffset: new OneEuroFilter({ minCutoff: 0.8, beta: 0.02 }),
    earShoulderOffsetRatio: new OneEuroFilter({ minCutoff: 0.8, beta: 0.02 }),
    headForwardRatio: new OneEuroFilter({ minCutoff: 0.8, beta: 0.02 }),
    torsoLeanRatio: new OneEuroFilter({ minCutoff: 0.8, beta: 0.02 }),
    shoulderTiltDeg: new OneEuroFilter({ minCutoff: 0.8, beta: 0.02 }),
    shoulderProtractionProxy: new OneEuroFilter({ minCutoff: 0.8, beta: 0.02 }),
    shoulderCompressionRatio: new OneEuroFilter({ minCutoff: 0.8, beta: 0.02 }),
    shoulderAsymmetryRatio: new OneEuroFilter({ minCutoff: 0.8, beta: 0.02 }),
    movementMagnitude: new OneEuroFilter({ minCutoff: 0.8, beta: 0.02 }),
  };

  smoothNormalizedPoseFrame(frame: NormalizedPoseFrame): NormalizedPoseFrame {
    return {
      ...frame,
      keypoints: frame.keypoints.map((keypoint) => this.smoothKeypoint(keypoint, frame.timestamp)),
    };
  }

  smoothFeatures(features: PostureFeatures): PostureFeatures {
    return {
      ...features,
      trunkAngleDeg: this.smoothFeatureValue('trunkAngleDeg', features.trunkAngleDeg, features.timestamp),
      headForwardOffset: this.smoothFeatureValue('headForwardOffset', features.headForwardOffset, features.timestamp),
      earShoulderOffsetRatio: this.smoothFeatureValue(
        'earShoulderOffsetRatio',
        features.earShoulderOffsetRatio,
        features.timestamp,
      ),
      headForwardRatio: this.smoothFeatureValue(
        'headForwardRatio',
        features.headForwardRatio,
        features.timestamp,
      ),
      torsoLeanRatio: this.smoothFeatureValue('torsoLeanRatio', features.torsoLeanRatio, features.timestamp),
      shoulderTiltDeg: this.smoothFeatureValue('shoulderTiltDeg', features.shoulderTiltDeg, features.timestamp),
      shoulderProtractionProxy: this.smoothFeatureValue(
        'shoulderProtractionProxy',
        features.shoulderProtractionProxy,
        features.timestamp,
      ),
      shoulderCompressionRatio: this.smoothFeatureValue(
        'shoulderCompressionRatio',
        features.shoulderCompressionRatio,
        features.timestamp,
      ),
      shoulderAsymmetryRatio: this.smoothFeatureValue(
        'shoulderAsymmetryRatio',
        features.shoulderAsymmetryRatio,
        features.timestamp,
      ),
      movementMagnitude: this.smoothFeatureValue('movementMagnitude', features.movementMagnitude, features.timestamp),
    };
  }

  reset() {
    this.keypointFilters.clear();
    Object.values(this.featureFilters).forEach((filter) => {
      filter.reset();
    });
  }

  private smoothKeypoint(keypoint: PoseKeypoint, timestamp: number): PoseKeypoint {
    const filters = this.getOrCreateKeypointFilters(keypoint.name);

    return {
      ...keypoint,
      x: filters.x.filter(keypoint.x, timestamp),
      y: filters.y.filter(keypoint.y, timestamp),
      score: filters.score.filter(keypoint.score, timestamp),
    };
  }

  private getOrCreateKeypointFilters(keypointName: string) {
    const existingFilters = this.keypointFilters.get(keypointName);

    if (existingFilters) {
      return existingFilters;
    }

    const nextFilters: KeypointFilterBank = {
      x: new OneEuroFilter(),
      y: new OneEuroFilter(),
      score: new OneEuroFilter({ minCutoff: 1.2, beta: 0 }),
    };

    this.keypointFilters.set(keypointName, nextFilters);
    return nextFilters;
  }

  private smoothFeatureValue(
    key: keyof PoseSignalSmoother['featureFilters'],
    value: number | null,
    timestamp: number,
  ) {
    if (value === null) {
      return null;
    }

    return this.featureFilters[key].filter(value, timestamp);
  }
}

function smoothingFactor(cutoff: number, elapsedSeconds: number) {
  const rate = 2 * Math.PI * cutoff * elapsedSeconds;
  return rate / (rate + 1);
}

function lowPass(value: number, previousValue: number, alpha: number) {
  return alpha * value + (1 - alpha) * previousValue;
}
