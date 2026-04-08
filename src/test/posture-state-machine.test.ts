import type { PostureFeatures } from '@/types/domain';
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
    shoulderTiltDeg: 0,
    shoulderProtractionProxy: 1,
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
}) {
  return {
    timestamp: options?.timestamp ?? 0,
    poseConfidence: options?.poseConfidence ?? 0.98,
    reliableKeypointCount: options?.reliableKeypointCount ?? 8,
    hasRequiredTorsoKeypoints: options?.hasRequiredTorsoKeypoints ?? true,
    features: options?.features ?? createFeatures({ timestamp: options?.timestamp ?? 0 }),
    calibrationProfile: null,
    signalQuality: options?.signalQuality ?? 'reliable',
    signalDropoutDurationMs: options?.signalDropoutDurationMs ?? 0,
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
});
