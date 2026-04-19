import type { PoseFrame, PoseKeypoint, PostureFeatures } from '@/types/domain';

export type RequiredPoseKeypointName =
  | 'left_shoulder'
  | 'right_shoulder'
  | 'left_hip'
  | 'right_hip';

export type ProcessingPoint = {
  x: number;
  y: number;
};

export type ConfidenceAssessment = {
  timestamp: number;
  overallScore: number;
  keypointThreshold: number;
  minPoseScore: number;
  reliableKeypoints: PoseKeypoint[];
  rejectedKeypoints: PoseKeypoint[];
  missingRequiredKeypoints: RequiredPoseKeypointName[];
  hasRequiredTorsoKeypoints: boolean;
  isPoseReliable: boolean;
};

export type FrameQualityState = 'GOOD' | 'LIMITED' | 'POOR';

export type FrameQualityAssessment = {
  state: FrameQualityState;
  score: number;
  hasHeadAndShoulders: boolean;
  hasTorsoContext: boolean;
  isCentered: boolean;
  usableForClassification: boolean;
  cautiousClassification: boolean;
  guidanceMessage: string | null;
};

export type TorsoAnchors = {
  midShoulder: ProcessingPoint;
  midHip: ProcessingPoint;
  origin: ProcessingPoint;
  torsoLength: number;
  shoulderWidth: number;
};

export type NormalizedPoseFrame = {
  timestamp: number;
  overallScore: number;
  anchors: TorsoAnchors;
  keypoints: PoseKeypoint[];
};

export type PoseSignalQuality = 'reliable' | 'grace_hold' | 'unreliable';

export type ProcessedPoseStability = {
  signalQuality: PoseSignalQuality;
  lastReliableTimestamp: number | null;
  dropoutDurationMs: number;
  graceWindowMs: number;
};

export type ProcessedPoseFrame = {
  rawPose: PoseFrame;
  confidence: ConfidenceAssessment;
  normalizedPose: NormalizedPoseFrame | null;
  features: PostureFeatures;
  stability: ProcessedPoseStability;
  frameQuality: FrameQualityAssessment;
};
