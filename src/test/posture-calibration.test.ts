import { buildCalibrationProfile } from '@/core/posture/posture-calibration';

describe('buildCalibrationProfile', () => {
  it('computes baseline medians and derived thresholds from calibration samples', () => {
    const profile = buildCalibrationProfile({
      preferredSensitivity: 'medium',
      now: 123,
      samples: [
        {
          timestamp: 1,
          trunkAngleDeg: 4,
          headForwardOffset: 0.11,
          shoulderTiltDeg: 1,
          torsoLength: 120,
        },
        {
          timestamp: 2,
          trunkAngleDeg: 6,
          headForwardOffset: 0.13,
          shoulderTiltDeg: 2,
          torsoLength: 118,
        },
        {
          timestamp: 3,
          trunkAngleDeg: 5,
          headForwardOffset: 0.12,
          shoulderTiltDeg: 3,
          torsoLength: 122,
        },
      ],
    });

    expect(profile.id).toBe('calibration-123');
    expect(profile.baselineTrunkAngle).toBeCloseTo(5);
    expect(profile.baselineHeadOffset).toBeCloseTo(0.12);
    expect(profile.baselineShoulderLevelDelta).toBeCloseTo(2);
    expect(profile.torsoLength).toBeCloseTo(120);
    expect(profile.mildSlouchThreshold).toBeCloseTo(13);
    expect(profile.deepSlouchThreshold).toBeCloseTo(20);
    expect(profile.headOffsetWarningThreshold).toBeCloseTo(0.34);
    expect(profile.shoulderTiltWarningThreshold).toBeCloseTo(7);
    expect(profile.sampleCount).toBe(3);
  });
});
