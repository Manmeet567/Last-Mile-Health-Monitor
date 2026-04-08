import type { DailyMetrics, LivePostureState, MonitoringSession, PostureEvent } from '@/types/domain';

export type DailyMetricsAccumulator = {
  dateKey: string;
  totalMonitoringMs: number;
  totalSittingMs: number;
  goodPostureMs: number;
  mildSlouchMs: number;
  deepSlouchMs: number;
  totalBreaks: number;
  longestSittingBoutMs: number;
  totalSittingBoutMs: number;
  sittingBoutCount: number;
  openSittingBoutStartedAt: number | null;
};

export type SessionAccumulator = {
  sessionId: string;
  startedAt: number;
  lastProcessedAt: number;
  lastPersistedAt: number;
  lastObservedState: LivePostureState;
  currentSittingBoutStartedAt: number | null;
  totalDurationMs: number;
  activeMonitoringMs: number;
  sittingMs: number;
  goodPostureMs: number;
  mildSlouchMs: number;
  deepSlouchMs: number;
  movingMs: number;
  awayMs: number;
  breakCount: number;
  longestSittingBoutMs: number;
  sittingBoutCount: number;
  totalSittingBoutMs: number;
  dailyMetricsAccumulators: Record<string, DailyMetricsAccumulator>;
};

export type SessionTickInput = {
  timestamp: number;
  currentState: LivePostureState;
};

export type SessionLifecycleEventType = Extract<PostureEvent['type'], 'SESSION_STARTED' | 'SESSION_ENDED'>;

export type MetricsSnapshot = {
  activeSession: MonitoringSession | null;
  latestCompletedSession: MonitoringSession | null;
  todayMetrics: DailyMetrics | null;
  isPersisting: boolean;
  error: string | null;
};
