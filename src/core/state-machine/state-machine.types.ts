import type {
  CalibrationProfile,
  LivePostureState,
  PostureEvent,
  PostureFeatures,
} from '@/types/domain';
import type {
  FrameQualityAssessment,
  PoseSignalQuality,
} from '@/core/processing/processing.types';

export type PostureStateMachineInput = {
  timestamp: number;
  poseConfidence: number;
  reliableKeypointCount: number;
  hasRequiredTorsoKeypoints: boolean;
  features: PostureFeatures;
  calibrationProfile: CalibrationProfile | null;
  signalQuality: PoseSignalQuality;
  signalDropoutDurationMs: number;
  frameQuality: FrameQualityAssessment;
};

export type PostureStateMachineConfig = {
  presencePoseScore: number;
  movementMagnitudeThreshold: number;
  mildSlouchThreshold: number;
  deepSlouchThreshold: number;
  headOffsetThreshold: number;
  headForwardRatioThreshold: number;
  torsoLeanRatioThreshold: number;
  shoulderCompressionThreshold: number;
  severeShoulderCompressionThreshold: number;
  earShoulderOffsetRatioThreshold: number;
  postureHysteresisDeg: number;
  headOffsetHysteresis: number;
  awayToNoPersonMs: number;
  dwellMs: Record<LivePostureState, number>;
};

export type PostureStateSnapshot = {
  state: LivePostureState;
  candidateState: LivePostureState;
  stateSince: number;
  candidateSince: number;
  reason: string;
  emittedEvents: PostureEvent[];
};
