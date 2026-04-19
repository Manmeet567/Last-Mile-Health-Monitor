import type { CalibrationProfile, PostureFeatures } from '@/types/domain';
import {
  advancePostureStateMachine,
  createInitialPostureStateSnapshot,
} from '@/core/state-machine/posture-state-machine';
import type { PostureStateSnapshot } from '@/core/state-machine/state-machine.types';

function createFeatures(overrides?: Partial<PostureFeatures>): PostureFeatures {
  return {
    timestamp: 0,
    trunkAngleDeg: 0,
    headForwardOffset: 0,
    earShoulderOffsetRatio: 0.2,
    headForwardRatio: 0,
    torsoLeanRatio: 0,
    shoulderTiltDeg: 0,
    shoulderProtractionProxy: 1,
    shoulderCompressionRatio: 0,
    shoulderAsymmetryRatio: 0,
    movementMagnitude: 0,
    isConfidenceSufficient: true,
    ...overrides,
  };
}

function createInput(options?: {
  timestamp?: number;
  poseConfidence?: number;
  reliableKeypointCount?: number;
  hasRequiredTorsoKeypoints?: boolean;
  features?: PostureFeatures;
  signalQuality?: 'reliable' | 'grace_hold' | 'unreliable';
  signalDropoutDurationMs?: number;
  calibrationProfile?: CalibrationProfile | null;
  frameQuality?: {
    state: 'GOOD' | 'LIMITED' | 'POOR';
    score: number;
    hasHeadAndShoulders: boolean;
    hasTorsoContext: boolean;
    isCentered: boolean;
    usableForClassification: boolean;
    cautiousClassification: boolean;
    guidanceMessage: string | null;
  };
}) {
  return {
    timestamp: options?.timestamp ?? 0,
    poseConfidence: options?.poseConfidence ?? 0.98,
    reliableKeypointCount: options?.reliableKeypointCount ?? 8,
    hasRequiredTorsoKeypoints: options?.hasRequiredTorsoKeypoints ?? true,
    features: options?.features ?? createFeatures({ timestamp: options?.timestamp ?? 0 }),
    calibrationProfile: options?.calibrationProfile ?? null,
    signalQuality: options?.signalQuality ?? 'reliable',
    signalDropoutDurationMs: options?.signalDropoutDurationMs ?? 0,
    frameQuality: options?.frameQuality ?? {
      state: 'GOOD',
      score: 0.92,
      hasHeadAndShoulders: true,
      hasTorsoContext: true,
      isCentered: true,
      usableForClassification: true,
      cautiousClassification: false,
      guidanceMessage: null,
    },
  };
}

describe('posture state machine', () => {
  it('transitions to mild slouch only after its dwell time is satisfied', () => {
    let snapshot = createInitialPostureStateSnapshot(0);

    snapshot = advancePostureStateMachine({
      previousSnapshot: snapshot,
      input: createInput({ timestamp: 0 }),
    });

    snapshot = advancePostureStateMachine({
      previousSnapshot: snapshot,
      input: createInput({
        timestamp: 1_000,
        features: createFeatures({ timestamp: 1_000, trunkAngleDeg: 14 }),
      }),
    });

    expect(snapshot.state).toBe('NO_PERSON');
    expect(snapshot.candidateState).toBe('MILD_SLOUCH');
    expect(snapshot.emittedEvents).toEqual([]);

    snapshot = advancePostureStateMachine({
      previousSnapshot: snapshot,
      input: createInput({
        timestamp: 7_500,
        features: createFeatures({ timestamp: 7_500, trunkAngleDeg: 14 }),
      }),
    });

    expect(snapshot.state).toBe('MILD_SLOUCH');
    expect(snapshot.emittedEvents.map((event) => event.type)).toEqual(['MILD_SLOUCH_STARTED']);
  });

  it('prefers moving when movement magnitude is above threshold', () => {
    const snapshot = advancePostureStateMachine({
      previousSnapshot: createInitialPostureStateSnapshot(0),
      input: createInput({
        timestamp: 2_000,
        features: createFeatures({ timestamp: 2_000, trunkAngleDeg: 25, movementMagnitude: 0.1 }),
      }),
    });

    expect(snapshot.candidateState).toBe('MOVING');
    expect(snapshot.reason).toMatch(/movement/i);
    expect(snapshot.emittedEvents).toEqual([]);
  });

  it('prevents confident posture classification when frame quality is poor', () => {
    const snapshot = advancePostureStateMachine({
      previousSnapshot: createInitialPostureStateSnapshot(0),
      input: createInput({
        timestamp: 3_000,
        frameQuality: {
          state: 'POOR',
          score: 0.24,
          hasHeadAndShoulders: false,
          hasTorsoContext: false,
          isCentered: false,
          usableForClassification: false,
          cautiousClassification: false,
          guidanceMessage: 'Move slightly back so your upper torso stays visible.',
        },
      }),
    });

    expect(snapshot.state).toBe('NO_PERSON');
    expect(snapshot.candidateState).toBe('DETECTING');
    expect(snapshot.reason).toMatch(/upper torso stays visible/i);
  });

  it('moves from away to no person after the configured timeout', () => {
    let snapshot: PostureStateSnapshot = {
      state: 'AWAY',
      candidateState: 'NO_PERSON',
      stateSince: 0,
      candidateSince: 0,
      reason: 'Absent from frame.',
      emittedEvents: [],
    };

    snapshot = advancePostureStateMachine({
      previousSnapshot: snapshot,
      input: createInput({
        timestamp: 12_500,
        poseConfidence: 0,
        reliableKeypointCount: 0,
        hasRequiredTorsoKeypoints: false,
        features: createFeatures({ timestamp: 12_500, isConfidenceSufficient: false }),
        signalQuality: 'unreliable',
        signalDropoutDurationMs: 12_500,
      }),
    });

    expect(snapshot.state).toBe('NO_PERSON');
    expect(snapshot.emittedEvents).toEqual([]);
  });

  it('treats present but poorly framed input as guidance instead of no person', () => {
    const snapshot = advancePostureStateMachine({
      previousSnapshot: createInitialPostureStateSnapshot(0),
      input: createInput({
        timestamp: 1_000,
        reliableKeypointCount: 3,
        hasRequiredTorsoKeypoints: false,
        poseConfidence: 0.42,
        features: createFeatures({ timestamp: 1_000, isConfidenceSufficient: false }),
        frameQuality: {
          state: 'POOR',
          score: 0.34,
          hasHeadAndShoulders: true,
          hasTorsoContext: false,
          isCentered: true,
          usableForClassification: false,
          cautiousClassification: false,
          guidanceMessage: 'Move slightly back so your upper torso stays visible.',
        },
      }),
    });

    expect(snapshot.candidateState).toBe('DETECTING');
    expect(snapshot.reason).toMatch(/upper torso stays visible/i);
  });

  it('keeps mild slouch stable near the threshold until posture clearly recovers', () => {
    const snapshot = advancePostureStateMachine({
      previousSnapshot: {
        state: 'MILD_SLOUCH',
        candidateState: 'MILD_SLOUCH',
        stateSince: 0,
        candidateSince: 0,
        reason: 'Stable mild slouch.',
        emittedEvents: [],
      },
      input: createInput({
        timestamp: 1_000,
        features: createFeatures({ timestamp: 1_000, trunkAngleDeg: 11.2 }),
      }),
    });

    expect(snapshot.state).toBe('MILD_SLOUCH');
    expect(snapshot.candidateState).toBe('MILD_SLOUCH');
    expect(snapshot.reason).toMatch(/recovery threshold/i);
  });

  it('requires slightly stronger evidence before entering mild slouch from good posture', () => {
    const snapshot = advancePostureStateMachine({
      previousSnapshot: {
        state: 'GOOD_POSTURE',
        candidateState: 'GOOD_POSTURE',
        stateSince: 0,
        candidateSince: 0,
        reason: 'Stable good posture.',
        emittedEvents: [],
      },
      input: createInput({
        timestamp: 1_000,
        features: createFeatures({ timestamp: 1_000, trunkAngleDeg: 12.5 }),
      }),
    });

    expect(snapshot.state).toBe('GOOD_POSTURE');
    expect(snapshot.candidateState).toBe('GOOD_POSTURE');
  });

  it('allows posture classification when frame quality is good', () => {
    const snapshot = advancePostureStateMachine({
      previousSnapshot: createInitialPostureStateSnapshot(0),
      input: createInput({
        timestamp: 3_000,
        features: createFeatures({ timestamp: 3_000, trunkAngleDeg: 0 }),
      }),
    });

    expect(snapshot.candidateState).toBe('GOOD_POSTURE');
    expect(snapshot.reason).toMatch(/good range/i);
  });

  it('emits a break ended event when the user returns from away', () => {
    let snapshot: PostureStateSnapshot = {
      state: 'AWAY',
      candidateState: 'GOOD_POSTURE',
      stateSince: 0,
      candidateSince: 0,
      reason: 'Absent from frame.',
      emittedEvents: [],
    };

    snapshot = advancePostureStateMachine({
      previousSnapshot: snapshot,
      input: createInput({ timestamp: 2_500 }),
    });

    expect(snapshot.state).toBe('GOOD_POSTURE');
    expect(snapshot.emittedEvents.map((event) => event.type)).toEqual(['BREAK_ENDED']);
  });

  it('holds the last stable posture during a brief grace-window dropout', () => {
    const snapshot = advancePostureStateMachine({
      previousSnapshot: {
        state: 'GOOD_POSTURE',
        candidateState: 'GOOD_POSTURE',
        stateSince: 1_000,
        candidateSince: 1_000,
        reason: 'Stable.',
        emittedEvents: [],
      },
      input: createInput({
        timestamp: 1_600,
        reliableKeypointCount: 2,
        hasRequiredTorsoKeypoints: false,
        features: createFeatures({ timestamp: 1_600, isConfidenceSufficient: true }),
        signalQuality: 'grace_hold',
        signalDropoutDurationMs: 600,
      }),
    });

    expect(snapshot.state).toBe('GOOD_POSTURE');
    expect(snapshot.candidateState).toBe('GOOD_POSTURE');
    expect(snapshot.reason).toMatch(/briefly/i);
    expect(snapshot.emittedEvents).toEqual([]);
  });

  it('uses baseline-relative scoring when calibration data exists', () => {
    const calibrationProfile: CalibrationProfile = {
      id: 'profile-1',
      createdAt: 0,
      updatedAt: 0,
      baselineTrunkAngle: 10,
      baselineHeadOffset: 0.1,
      torsoLength: 1,
      preferredSensitivity: 'medium',
      mildSlouchThreshold: 18,
      deepSlouchThreshold: 25,
      headOffsetWarningThreshold: 0.32,
      sampleCount: 72,
    };

    const withoutCalibration = advancePostureStateMachine({
      previousSnapshot: createInitialPostureStateSnapshot(0),
      input: createInput({
        timestamp: 3_000,
        features: createFeatures({
          timestamp: 3_000,
          trunkAngleDeg: 16,
          headForwardOffset: 0.05,
        }),
      }),
    });

    const withCalibration = advancePostureStateMachine({
      previousSnapshot: createInitialPostureStateSnapshot(0),
      input: createInput({
        timestamp: 3_000,
        calibrationProfile,
        features: createFeatures({
          timestamp: 3_000,
          trunkAngleDeg: 16,
          headForwardOffset: 0.05,
        }),
      }),
    });

    expect(withoutCalibration.candidateState).toBe('MILD_SLOUCH');
    expect(withCalibration.candidateState).toBe('GOOD_POSTURE');
  });
});
