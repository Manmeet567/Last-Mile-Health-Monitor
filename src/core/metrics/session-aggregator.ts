import type { DailyMetrics, LivePostureState, MonitoringSession, PostureEvent } from '@/types/domain';
import type { SessionAccumulator, SessionLifecycleEventType, SessionTickInput, DailyMetricsAccumulator } from '@/core/metrics/metrics.types';
import { toDateKey } from '@/utils/date';

const ACTIVE_MONITORING_STATES = new Set<LivePostureState>([
  'DETECTING',
  'GOOD_POSTURE',
  'MILD_SLOUCH',
  'DEEP_SLOUCH',
  'MOVING',
]);

const SITTING_STATES = new Set<LivePostureState>([
  'GOOD_POSTURE',
  'MILD_SLOUCH',
  'DEEP_SLOUCH',
  'MOVING',
]);

export function createSessionAccumulator(
  sessionId: string,
  startedAt: number,
  initialState: LivePostureState,
): SessionAccumulator {
  return {
    sessionId,
    startedAt,
    lastProcessedAt: startedAt,
    lastPersistedAt: startedAt,
    lastObservedState: initialState,
    currentSittingBoutStartedAt: isSittingState(initialState) ? startedAt : null,
    totalDurationMs: 0,
    activeMonitoringMs: 0,
    sittingMs: 0,
    goodPostureMs: 0,
    mildSlouchMs: 0,
    deepSlouchMs: 0,
    movingMs: 0,
    awayMs: 0,
    breakCount: 0,
    longestSittingBoutMs: 0,
    sittingBoutCount: 0,
    totalSittingBoutMs: 0,
    dailyMetricsAccumulators: {},
  };
}

export function advanceSessionAccumulator(
  accumulator: SessionAccumulator,
  input: SessionTickInput,
): SessionAccumulator {
  const next = { ...accumulator };
  const timestamp = Math.max(input.timestamp, accumulator.lastProcessedAt);
  const elapsedMs = timestamp - accumulator.lastProcessedAt;

  if (elapsedMs > 0) {
    applyStateDuration(next, accumulator.lastObservedState, accumulator.lastProcessedAt, timestamp);
  }

  if (accumulator.lastObservedState !== input.currentState) {
    if (accumulator.lastObservedState !== 'AWAY' && input.currentState === 'AWAY') {
      next.breakCount += 1;
      incrementDailyBreakCount(next, timestamp);
    }

    if (isSittingState(accumulator.lastObservedState) && !isSittingState(input.currentState)) {
      closeSittingBout(next, timestamp);
      closeOpenDailySittingBouts(next, timestamp);
    }

    if (!isSittingState(accumulator.lastObservedState) && isSittingState(input.currentState)) {
      next.currentSittingBoutStartedAt = timestamp;
    }
  }

  next.lastObservedState = input.currentState;
  next.lastProcessedAt = timestamp;
  return next;
}

export function finalizeSessionAccumulator(
  accumulator: SessionAccumulator,
  endedAt: number,
): SessionAccumulator {
  const next = advanceSessionAccumulator(accumulator, {
    timestamp: Math.max(endedAt, accumulator.lastProcessedAt),
    currentState: accumulator.lastObservedState,
  });

  if (next.currentSittingBoutStartedAt !== null) {
    closeSittingBout(next, Math.max(endedAt, next.lastProcessedAt));
  }

  closeOpenDailySittingBouts(next, Math.max(endedAt, next.lastProcessedAt));
  return next;
}

export function materializeMonitoringSession(
  accumulator: SessionAccumulator,
  endedAt: number | null = null,
  previewTimestamp = accumulator.lastProcessedAt,
): MonitoringSession {
  const now = Math.max(previewTimestamp, accumulator.lastProcessedAt);
  const activeBoutMs =
    accumulator.currentSittingBoutStartedAt !== null
      ? Math.max(now - accumulator.currentSittingBoutStartedAt, 0)
      : 0;

  return {
    id: accumulator.sessionId,
    startedAt: accumulator.startedAt,
    endedAt,
    totalDurationSec: toWholeSeconds(accumulator.totalDurationMs),
    activeMonitoringSec: toWholeSeconds(accumulator.activeMonitoringMs),
    sittingSec: toWholeSeconds(accumulator.sittingMs),
    goodPostureSec: toWholeSeconds(accumulator.goodPostureMs),
    mildSlouchSec: toWholeSeconds(accumulator.mildSlouchMs),
    deepSlouchSec: toWholeSeconds(accumulator.deepSlouchMs),
    movingSec: toWholeSeconds(accumulator.movingMs),
    awaySec: toWholeSeconds(accumulator.awayMs),
    breakCount: accumulator.breakCount,
    longestSittingBoutSec: toWholeSeconds(Math.max(accumulator.longestSittingBoutMs, activeBoutMs)),
    sittingBoutCount:
      accumulator.sittingBoutCount + (accumulator.currentSittingBoutStartedAt !== null ? 1 : 0),
  };
}

export function createEmptyDailyMetrics(dateKey: string): DailyMetrics {
  return {
    dateKey,
    totalMonitoringSec: 0,
    totalSittingSec: 0,
    goodPostureSec: 0,
    mildSlouchSec: 0,
    deepSlouchSec: 0,
    totalBreaks: 0,
    longestSittingBoutSec: 0,
    averageSittingBoutSec: 0,
    remindersTriggered: 0,
    sittingBoutCount: 0,
  };
}

export function mergeSessionIntoDailyMetrics(
  existingMetrics: DailyMetrics | null,
  session: MonitoringSession,
): DailyMetrics {
  const contribution: DailyMetrics = {
    dateKey: existingMetrics?.dateKey ?? toDateKey(session.startedAt),
    totalMonitoringSec: session.totalDurationSec,
    totalSittingSec: session.sittingSec,
    goodPostureSec: session.goodPostureSec,
    mildSlouchSec: session.mildSlouchSec,
    deepSlouchSec: session.deepSlouchSec,
    totalBreaks: session.breakCount,
    longestSittingBoutSec: session.longestSittingBoutSec,
    averageSittingBoutSec:
      session.sittingBoutCount > 0 ? Math.round(session.sittingSec / session.sittingBoutCount) : 0,
    remindersTriggered: 0,
    sittingBoutCount: session.sittingBoutCount,
  };

  return mergeDailyMetrics(existingMetrics, contribution);
}

export function mergeDailyMetrics(
  existingMetrics: DailyMetrics | null,
  contribution: DailyMetrics,
): DailyMetrics {
  const nextDateKey = existingMetrics?.dateKey ?? contribution.dateKey;
  const base = existingMetrics ?? createEmptyDailyMetrics(nextDateKey);
  const totalSittingSec = base.totalSittingSec + contribution.totalSittingSec;
  const sittingBoutCount = base.sittingBoutCount + contribution.sittingBoutCount;

  return {
    dateKey: nextDateKey,
    totalMonitoringSec: base.totalMonitoringSec + contribution.totalMonitoringSec,
    totalSittingSec,
    goodPostureSec: base.goodPostureSec + contribution.goodPostureSec,
    mildSlouchSec: base.mildSlouchSec + contribution.mildSlouchSec,
    deepSlouchSec: base.deepSlouchSec + contribution.deepSlouchSec,
    totalBreaks: base.totalBreaks + contribution.totalBreaks,
    longestSittingBoutSec: Math.max(base.longestSittingBoutSec, contribution.longestSittingBoutSec),
    averageSittingBoutSec: sittingBoutCount > 0 ? Math.round(totalSittingSec / sittingBoutCount) : 0,
    remindersTriggered: base.remindersTriggered + contribution.remindersTriggered,
    sittingBoutCount,
  };
}

export function materializeDailyMetricsContributions(accumulator: SessionAccumulator): DailyMetrics[] {
  return Object.values(accumulator.dailyMetricsAccumulators)
    .sort((left, right) => left.dateKey.localeCompare(right.dateKey))
    .map((bucket) => ({
      dateKey: bucket.dateKey,
      totalMonitoringSec: toWholeSeconds(bucket.totalMonitoringMs),
      totalSittingSec: toWholeSeconds(bucket.totalSittingMs),
      goodPostureSec: toWholeSeconds(bucket.goodPostureMs),
      mildSlouchSec: toWholeSeconds(bucket.mildSlouchMs),
      deepSlouchSec: toWholeSeconds(bucket.deepSlouchMs),
      totalBreaks: bucket.totalBreaks,
      longestSittingBoutSec: toWholeSeconds(bucket.longestSittingBoutMs),
      averageSittingBoutSec:
        bucket.sittingBoutCount > 0
          ? Math.round(toWholeSeconds(bucket.totalSittingBoutMs) / bucket.sittingBoutCount)
          : 0,
      remindersTriggered: 0,
      sittingBoutCount: bucket.sittingBoutCount,
    }));
}

export function createSessionLifecycleEvent(options: {
  sessionId: string;
  timestamp: number;
  type: SessionLifecycleEventType;
  metadata?: Record<string, unknown>;
}): PostureEvent {
  const { sessionId, timestamp, type, metadata } = options;

  return {
    id: `${sessionId}-${type.toLowerCase()}-${timestamp}`,
    type,
    timestamp,
    metadata: {
      sessionId,
      ...metadata,
    },
  };
}

export function attachSessionMetadataToEvents(
  events: PostureEvent[],
  sessionId: string,
): PostureEvent[] {
  return events.map((event) => ({
    ...event,
    metadata: {
      ...event.metadata,
      sessionId,
    },
  }));
}

function applyStateDuration(
  accumulator: SessionAccumulator,
  state: LivePostureState,
  startedAt: number,
  endedAt: number,
) {
  const intervalChunks = splitIntervalByDateBoundary(startedAt, endedAt);

  for (const chunk of intervalChunks) {
    const elapsedMs = chunk.endedAt - chunk.startedAt;
    const bucket = getOrCreateDailyMetricsAccumulator(accumulator, chunk.dateKey);

    accumulator.totalDurationMs += elapsedMs;
    bucket.totalMonitoringMs += elapsedMs;

    if (ACTIVE_MONITORING_STATES.has(state)) {
      accumulator.activeMonitoringMs += elapsedMs;
    }

    if (SITTING_STATES.has(state)) {
      accumulator.sittingMs += elapsedMs;
      bucket.totalSittingMs += elapsedMs;

      if (bucket.openSittingBoutStartedAt === null) {
        bucket.openSittingBoutStartedAt = chunk.startedAt;
      }
    }

    if (state === 'GOOD_POSTURE') {
      accumulator.goodPostureMs += elapsedMs;
      bucket.goodPostureMs += elapsedMs;
    }

    if (state === 'MILD_SLOUCH') {
      accumulator.mildSlouchMs += elapsedMs;
      bucket.mildSlouchMs += elapsedMs;
    }

    if (state === 'DEEP_SLOUCH') {
      accumulator.deepSlouchMs += elapsedMs;
      bucket.deepSlouchMs += elapsedMs;
    }

    if (state === 'MOVING') {
      accumulator.movingMs += elapsedMs;
    }

    if (state === 'AWAY') {
      accumulator.awayMs += elapsedMs;
    }

    if (SITTING_STATES.has(state) && chunk.endsAtDateBoundary) {
      closeDailySittingBout(bucket, chunk.endedAt);
    }
  }
}

function closeSittingBout(accumulator: SessionAccumulator, endedAt: number) {
  if (accumulator.currentSittingBoutStartedAt === null) {
    return;
  }

  const boutDurationMs = Math.max(endedAt - accumulator.currentSittingBoutStartedAt, 0);
  accumulator.longestSittingBoutMs = Math.max(accumulator.longestSittingBoutMs, boutDurationMs);
  accumulator.totalSittingBoutMs += boutDurationMs;
  accumulator.sittingBoutCount += 1;
  accumulator.currentSittingBoutStartedAt = null;
}

function closeOpenDailySittingBouts(accumulator: SessionAccumulator, endedAt: number) {
  for (const bucket of Object.values(accumulator.dailyMetricsAccumulators)) {
    if (bucket.openSittingBoutStartedAt !== null) {
      closeDailySittingBout(bucket, endedAt);
    }
  }
}

function closeDailySittingBout(bucket: DailyMetricsAccumulator, endedAt: number) {
  if (bucket.openSittingBoutStartedAt === null) {
    return;
  }

  const boutDurationMs = Math.max(endedAt - bucket.openSittingBoutStartedAt, 0);
  bucket.longestSittingBoutMs = Math.max(bucket.longestSittingBoutMs, boutDurationMs);
  bucket.totalSittingBoutMs += boutDurationMs;
  bucket.sittingBoutCount += 1;
  bucket.openSittingBoutStartedAt = null;
}

function incrementDailyBreakCount(accumulator: SessionAccumulator, timestamp: number) {
  const bucket = getOrCreateDailyMetricsAccumulator(accumulator, toDateKey(timestamp));
  bucket.totalBreaks += 1;
}

function getOrCreateDailyMetricsAccumulator(
  accumulator: SessionAccumulator,
  dateKey: string,
): DailyMetricsAccumulator {
  const existing = accumulator.dailyMetricsAccumulators[dateKey];

  if (existing) {
    return existing;
  }

  const created: DailyMetricsAccumulator = {
    dateKey,
    totalMonitoringMs: 0,
    totalSittingMs: 0,
    goodPostureMs: 0,
    mildSlouchMs: 0,
    deepSlouchMs: 0,
    totalBreaks: 0,
    longestSittingBoutMs: 0,
    totalSittingBoutMs: 0,
    sittingBoutCount: 0,
    openSittingBoutStartedAt: null,
  };

  accumulator.dailyMetricsAccumulators[dateKey] = created;
  return created;
}

function splitIntervalByDateBoundary(startedAt: number, endedAt: number) {
  const chunks: Array<{
    dateKey: string;
    startedAt: number;
    endedAt: number;
    endsAtDateBoundary: boolean;
  }> = [];

  let cursor = startedAt;

  while (cursor < endedAt) {
    const nextBoundary = getNextUtcMidnight(cursor);
    const chunkEndedAt = Math.min(endedAt, nextBoundary);

    chunks.push({
      dateKey: toDateKey(cursor),
      startedAt: cursor,
      endedAt: chunkEndedAt,
      endsAtDateBoundary: chunkEndedAt === nextBoundary && chunkEndedAt < endedAt,
    });

    cursor = chunkEndedAt;
  }

  return chunks;
}

function getNextUtcMidnight(timestamp: number) {
  const date = new Date(timestamp);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1);
}

function isSittingState(state: LivePostureState) {
  return SITTING_STATES.has(state);
}

function toWholeSeconds(durationMs: number) {
  return Math.max(Math.round(durationMs / 1000), 0);
}
