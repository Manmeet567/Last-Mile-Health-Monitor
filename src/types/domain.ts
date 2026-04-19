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
  torsoLength: number;
  preferredSensitivity: 'low' | 'medium' | 'high';
  mildSlouchThreshold: number;
  deepSlouchThreshold: number;
  headOffsetWarningThreshold: number;
  sampleCount: number;
};

export type PostureFeatures = {
  timestamp: number;
  trunkAngleDeg: number | null;
  headForwardOffset: number | null;
  earShoulderOffsetRatio: number | null;
  headForwardRatio: number | null;
  torsoLeanRatio: number | null;
  shoulderTiltDeg: number | null;
  shoulderProtractionProxy: number | null;
  shoulderCompressionRatio: number | null;
  shoulderAsymmetryRatio: number | null;
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
  durationMs?: number;
  activeMonitoringSec: number;
  sittingSec: number;
  goodPostureSec: number;
  goodPostureMs?: number;
  mildSlouchSec: number;
  deepSlouchSec: number;
  slouchMs?: number;
  movingSec: number;
  awaySec: number;
  breakCount: number;
  nudgeCount?: number;
  longestSlouchStreakMs?: number;
  goodPosturePercent?: number;
  sessionScoreLabel?: 'Good' | 'Okay' | 'Needs improvement';
  insights?: string[];
  reflectionLine?: string;
  recoverySuggestion?: string;
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
  reminderSettings: ReminderSettings;
};

export type PresetSymptomId =
  | 'neck-pain-or-stiffness'
  | 'upper-back-discomfort'
  | 'lower-back-discomfort'
  | 'shoulder-tightness'
  | 'wrist-hand-discomfort'
  | 'eye-strain'
  | 'headache'
  | 'numbness-or-tingling'
  | 'dizziness'
  | 'fatigue-after-long-sitting'
  | 'reduced-focus'
  | 'poor-sleep-affecting-desk-comfort';

export type SymptomSeverity = 1 | 2 | 3 | 4 | 5;

export type SymptomDuration =
  | 'under-1-hour'
  | '1-3-hours'
  | 'most-of-day'
  | 'several-days';

export type SymptomCheckInSource = 'manual' | 'daily-reminder';

export type SavedCustomSymptom = {
  id: string;
  label: string;
  createdAt: number;
};

export type SymptomCheckIn = {
  id: string;
  createdAt: number;
  dateKey: string;
  source: SymptomCheckInSource;
  presetSymptoms: PresetSymptomId[];
  customSymptoms: string[];
  severity: SymptomSeverity;
  duration: SymptomDuration;
  interferedWithWork: boolean;
};
