export type PoseKeypoint = {
  name: string;
  x: number;
  y: number;
  score: number;
};

export type PoseFrame = {
  timestamp: number;
  keypoints: PoseKeypoint[];
  overallScore: number;
};

export type NormalizedKeypoint = PoseKeypoint;

export type CalibrationProfile = {
  id: string;
  createdAt: number;
  updatedAt: number;
  baselineTrunkAngle: number;
  baselineHeadOffset: number;
  baselineShoulderLevelDelta: number;
  torsoLength: number;
  preferredSensitivity: 'low' | 'medium' | 'high';
  confidenceThreshold: number;
  mildSlouchThreshold: number;
  deepSlouchThreshold: number;
  headOffsetWarningThreshold: number;
  shoulderTiltWarningThreshold: number;
  sampleCount: number;
};

export type PostureFeatures = {
  timestamp: number;
  trunkAngleDeg: number | null;
  headForwardOffset: number | null;
  shoulderTiltDeg: number | null;
  shoulderProtractionProxy: number | null;
  movementMagnitude: number | null;
  isConfidenceSufficient: boolean;
};

export type LivePostureState =
  | 'NO_PERSON'
  | 'DETECTING'
  | 'GOOD_POSTURE'
  | 'MILD_SLOUCH'
  | 'DEEP_SLOUCH'
  | 'MOVING'
  | 'AWAY';

export type PostureEvent = {
  id: string;
  type:
    | 'SESSION_STARTED'
    | 'SESSION_ENDED'
    | 'MILD_SLOUCH_STARTED'
    | 'MILD_SLOUCH_ENDED'
    | 'DEEP_SLOUCH_STARTED'
    | 'DEEP_SLOUCH_ENDED'
    | 'BREAK_STARTED'
    | 'BREAK_ENDED'
    | 'REMINDER_TRIGGERED';
  timestamp: number;
  metadata?: Record<string, unknown>;
};

export type MonitoringSession = {
  id: string;
  startedAt: number;
  endedAt: number | null;
  totalDurationSec: number;
  activeMonitoringSec: number;
  sittingSec: number;
  goodPostureSec: number;
  mildSlouchSec: number;
  deepSlouchSec: number;
  movingSec: number;
  awaySec: number;
  breakCount: number;
  longestSittingBoutSec: number;
  sittingBoutCount: number;
};

export type DailyMetrics = {
  dateKey: string;
  totalMonitoringSec: number;
  totalSittingSec: number;
  goodPostureSec: number;
  mildSlouchSec: number;
  deepSlouchSec: number;
  totalBreaks: number;
  longestSittingBoutSec: number;
  averageSittingBoutSec: number;
  remindersTriggered: number;
  sittingBoutCount: number;
};

export type ReminderSettings = {
  enabled: boolean;
  minimumSittingBeforeReminderMin: number;
  slouchThresholdBeforeReminderSec: number;
  reminderCooldownMin: number;
  workingHoursStart?: string;
  workingHoursEnd?: string;
};

export type AppSettings = {
  selectedCameraId?: string;
  targetInferenceFps: number;
  preferredModelVariant: 'lightning';
  theme: 'system' | 'light' | 'dark';
  privacyMode: 'strict';
  reminderSettings: ReminderSettings;
};
