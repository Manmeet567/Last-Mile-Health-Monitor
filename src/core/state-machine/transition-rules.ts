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
  headForwardRatioThreshold: 0.18,
  torsoLeanRatioThreshold: 0.14,
  shoulderCompressionThreshold: 0.16,
  severeShoulderCompressionThreshold: 0.28,
  earShoulderOffsetRatioThreshold: 0.62,
  postureHysteresisDeg: 1.5,
  headOffsetHysteresis: 0.025,
  awayToNoPersonMs: 8_000,
  dwellMs: {
    NO_PERSON: 0,
    DETECTING: 900,
    GOOD_POSTURE: 2_500,
    MILD_SLOUCH: 6_000,
    DEEP_SLOUCH: 12_000,
    MOVING: 1_500,
    AWAY: 3_000,
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

  if (input.frameQuality.state === 'POOR') {
    return {
      state: 'DETECTING',
      reason:
        input.frameQuality.guidanceMessage ??
        'Keep your upper torso visible so posture can be measured.',
    };
  }

  if (!input.hasRequiredTorsoKeypoints || !input.features.isConfidenceSufficient) {
    return {
      state: 'DETECTING',
      reason: getDetectingReason(input),
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
  const thresholdSet = buildThresholdSet(currentState, config);
  const evidence = buildPostureEvidence(input, config);

  if (
    input.frameQuality.cautiousClassification &&
    !evidence.allowLimitedFrameClassification
  ) {
    return {
      state: 'DETECTING',
      reason:
        input.frameQuality.guidanceMessage ??
        'Hold still and keep your upper torso clearly in frame.',
    };
  }

  if (
    trunkAngle >= thresholdSet.deepEnterTrunk ||
    headOffset >= thresholdSet.deepEnterHeadOffset ||
    evidence.deepSupportCount >= 3 ||
    (evidence.primaryMildTriggered && evidence.deepSupportCount >= 2)
  ) {
    return {
      state: 'DEEP_SLOUCH',
      reason: buildClassificationReason('DEEP_SLOUCH', evidence),
    };
  }

  if (currentState === 'DEEP_SLOUCH') {
    if (
      trunkAngle >= thresholdSet.deepExitTrunk ||
      headOffset >= thresholdSet.deepExitHeadOffset
    ) {
      return {
        state: 'DEEP_SLOUCH',
        reason: 'Holding deep slouch until posture clears the recovery threshold.',
      };
    }
  }

  if (
    trunkAngle >= thresholdSet.mildEnterTrunk ||
    headOffset >= thresholdSet.mildEnterHeadOffset ||
    evidence.mildSupportCount >= 2
  ) {
    return {
      state: 'MILD_SLOUCH',
      reason: buildClassificationReason('MILD_SLOUCH', evidence),
    };
  }

  if (currentState === 'MILD_SLOUCH') {
    if (
      trunkAngle >= thresholdSet.mildExitTrunk ||
      headOffset >= thresholdSet.mildExitHeadOffset
    ) {
      return {
        state: 'MILD_SLOUCH',
        reason: 'Holding mild slouch until posture clears the recovery threshold.',
      };
    }
  }

  return {
    state: 'GOOD_POSTURE',
    reason: 'Posture is within the current calibrated good range.',
  };
}

function buildThresholdSet(
  currentState: LivePostureState,
  config: PostureStateMachineConfig,
) {
  const deepHeadOffsetThreshold = config.headOffsetThreshold * 1.25;

  return {
    mildEnterTrunk:
      currentState === 'GOOD_POSTURE'
        ? config.mildSlouchThreshold + config.postureHysteresisDeg
        : config.mildSlouchThreshold,
    mildExitTrunk: Math.max(
      config.mildSlouchThreshold - config.postureHysteresisDeg,
      0,
    ),
    deepEnterTrunk:
      currentState === 'DEEP_SLOUCH'
        ? config.deepSlouchThreshold
        : config.deepSlouchThreshold + config.postureHysteresisDeg,
    deepExitTrunk: Math.max(
      config.deepSlouchThreshold - config.postureHysteresisDeg,
      config.mildSlouchThreshold,
    ),
    mildEnterHeadOffset:
      currentState === 'GOOD_POSTURE'
        ? config.headOffsetThreshold + config.headOffsetHysteresis
        : config.headOffsetThreshold,
    mildExitHeadOffset: Math.max(
      config.headOffsetThreshold - config.headOffsetHysteresis,
      0,
    ),
    deepEnterHeadOffset:
      currentState === 'DEEP_SLOUCH'
        ? deepHeadOffsetThreshold
        : deepHeadOffsetThreshold + config.headOffsetHysteresis,
    deepExitHeadOffset: Math.max(
      deepHeadOffsetThreshold - config.headOffsetHysteresis,
      config.headOffsetThreshold,
    ),
  };
}

function getDetectingReason(input: PostureStateMachineInput) {
  if (input.frameQuality.guidanceMessage) {
    return input.frameQuality.guidanceMessage;
  }

  return input.signalDropoutDurationMs > 0
    ? 'The person is still present, but the posture signal is temporarily too weak to classify.'
    : 'A person is partially detected, but the posture signal is not reliable yet.';
}

function buildPostureEvidence(
  input: PostureStateMachineInput,
  config: PostureStateMachineConfig,
) {
  const baselineTrunkAngle = input.calibrationProfile?.baselineTrunkAngle ?? 0;
  const baselineHeadOffset = input.calibrationProfile?.baselineHeadOffset ?? 0;
  const mildTrunkDelta = Math.max(config.mildSlouchThreshold - baselineTrunkAngle, 1);
  const headDelta = Math.max(config.headOffsetThreshold - baselineHeadOffset, 0.05);
  const trunkDeviation = Math.max((input.features.trunkAngleDeg ?? 0) - baselineTrunkAngle, 0);
  const headDeviation = Math.max((input.features.headForwardOffset ?? 0) - baselineHeadOffset, 0);

  const supportFlags = [
    (input.features.headForwardRatio ?? 0) >= config.headForwardRatioThreshold,
    (input.features.torsoLeanRatio ?? 0) >= config.torsoLeanRatioThreshold,
    (input.features.shoulderCompressionRatio ?? 0) >= config.shoulderCompressionThreshold,
    (input.features.earShoulderOffsetRatio ?? 0) >= config.earShoulderOffsetRatioThreshold,
  ];
  const deepSupportFlags = [
    (input.features.headForwardRatio ?? 0) >= config.headForwardRatioThreshold * 1.5,
    (input.features.torsoLeanRatio ?? 0) >= config.torsoLeanRatioThreshold * 1.5,
    (input.features.shoulderCompressionRatio ?? 0) >= config.severeShoulderCompressionThreshold,
    (input.features.earShoulderOffsetRatio ?? 0) >= config.earShoulderOffsetRatioThreshold * 1.3,
  ];

  return {
    baselineRelativeActive: Boolean(input.calibrationProfile),
    trunkDeviation,
    headDeviation,
    primaryMildTriggered: trunkDeviation >= mildTrunkDelta || headDeviation >= headDelta,
    mildSupportCount: supportFlags.filter(Boolean).length,
    deepSupportCount: deepSupportFlags.filter(Boolean).length,
    allowLimitedFrameClassification:
      trunkDeviation >= mildTrunkDelta ||
      headDeviation >= headDelta ||
      deepSupportFlags.filter(Boolean).length >= 2,
  };
}

function buildClassificationReason(
  state: Extract<LivePostureState, 'MILD_SLOUCH' | 'DEEP_SLOUCH'>,
  evidence: ReturnType<typeof buildPostureEvidence>,
) {
  const baselinePhrase = evidence.baselineRelativeActive
    ? ' relative to the current baseline'
    : '';

  if (state === 'DEEP_SLOUCH') {
    return `Multiple seated-posture signals now point to a deeper slouch${baselinePhrase}.`;
  }

  return `Current seated-posture signals show a sustained slouch pattern${baselinePhrase}.`;
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
