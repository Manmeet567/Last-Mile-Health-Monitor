import type { CalibrationProfile, LivePostureState } from '@/types/domain';
import type {
  PostureStateMachineConfig,
  PostureStateMachineInput,
} from '@/core/state-machine/state-machine.types';

export const defaultStateMachineConfig: PostureStateMachineConfig = {
  presencePoseScore: 0.12,
  movementMagnitudeThreshold: 0.06,
  mildSlouchThreshold: 12,
  deepSlouchThreshold: 20,
  headOffsetThreshold: 0.25,
  awayToNoPersonMs: 12_000,
  dwellMs: {
    NO_PERSON: 0,
    DETECTING: 1_500,
    GOOD_POSTURE: 2_500,
    MILD_SLOUCH: 6_000,
    DEEP_SLOUCH: 12_000,
    MOVING: 1_500,
    AWAY: 5_000,
  },
};

export function deriveStateMachineConfig(
  calibrationProfile: CalibrationProfile | null,
): PostureStateMachineConfig {
  if (!calibrationProfile) {
    return defaultStateMachineConfig;
  }

  return {
    ...defaultStateMachineConfig,
    mildSlouchThreshold: calibrationProfile.mildSlouchThreshold,
    deepSlouchThreshold: calibrationProfile.deepSlouchThreshold,
    headOffsetThreshold: calibrationProfile.headOffsetWarningThreshold,
  };
}

export function classifyImmediateState(
  input: PostureStateMachineInput | null,
  currentState: LivePostureState,
  config: PostureStateMachineConfig,
): {
  state: LivePostureState;
  reason: string;
} {
  if (!input) {
    return {
      state: 'NO_PERSON',
      reason: 'No pose frame is currently available.',
    };
  }

  if (input.signalQuality === 'grace_hold' && canHoldCurrentState(currentState)) {
    return {
      state: currentState,
      reason: 'The posture signal dipped briefly, so the last stable state is being held.',
    };
  }

  const hasPresence =
    input.reliableKeypointCount > 0 || input.poseConfidence >= config.presencePoseScore;

  if (!hasPresence) {
    if (currentState === 'AWAY') {
      return {
        state: 'NO_PERSON',
        reason: 'The user has been absent long enough to count as no person present.',
      };
    }

    if (isPresenceState(currentState)) {
      return {
        state: 'AWAY',
        reason: 'The user was recently present but is now absent from the frame.',
      };
    }

    return {
      state: 'NO_PERSON',
      reason: 'No reliable person is currently detected.',
    };
  }

  if (!input.hasRequiredTorsoKeypoints || !input.features.isConfidenceSufficient) {
    return {
      state: 'DETECTING',
      reason:
        input.signalDropoutDurationMs > 0
          ? 'The person is still present, but the posture signal is temporarily too weak to classify.'
          : 'A person is partially detected, but the posture signal is not reliable yet.',
    };
  }

  const movementMagnitude = input.features.movementMagnitude ?? 0;
  if (movementMagnitude >= config.movementMagnitudeThreshold) {
    return {
      state: 'MOVING',
      reason: 'Movement is high enough that posture should not be judged yet.',
    };
  }

  const trunkAngle = input.features.trunkAngleDeg ?? 0;
  const headOffset = input.features.headForwardOffset ?? 0;

  if (trunkAngle >= config.deepSlouchThreshold || headOffset >= config.headOffsetThreshold * 1.25) {
    return {
      state: 'DEEP_SLOUCH',
      reason: 'The current posture exceeds the deep slouch threshold.',
    };
  }

  if (trunkAngle >= config.mildSlouchThreshold || headOffset >= config.headOffsetThreshold) {
    return {
      state: 'MILD_SLOUCH',
      reason: 'The current posture exceeds the mild slouch threshold.',
    };
  }

  return {
    state: 'GOOD_POSTURE',
    reason: 'Posture is within the current calibrated good range.',
  };
}

function canHoldCurrentState(state: LivePostureState) {
  return state !== 'NO_PERSON';
}

function isPresenceState(state: LivePostureState) {
  return (
    state === 'GOOD_POSTURE' ||
    state === 'MILD_SLOUCH' ||
    state === 'DEEP_SLOUCH' ||
    state === 'MOVING' ||
    state === 'DETECTING'
  );
}
