import type { FrameQualityState } from '@/core/processing/processing.types';
import type { ActiveReminder } from '@/core/reminders/reminder.types';
import type { LivePostureState, ReminderSettings } from '@/types/domain';

const MILD_SLOUCH_THRESHOLD_MS = 25_000;
const DEEP_SLOUCH_THRESHOLD_MS = 12_000;
const POSTURE_SOFT_COOLDOWN_MS = 90_000;
const POSTURE_STRONG_COOLDOWN_MS = 60_000;
const BREAK_COOLDOWN_MS = 7 * 60_000;
const BREAK_DETECTION_MS = 60_000;
export const LONG_AWAY_SESSION_END_MS = 150_000;
const AUTO_DISMISS_MS = 5_000;
const BREAK_THRESHOLD_FALLBACK_MIN = 45;
const MAX_HISTORY_ENTRIES = 12;

const SOFT_POSTURE_MESSAGES = [
  'Sit a little taller',
  'Relax your shoulders',
  'Straighten your back',
] as const;

const STRONG_POSTURE_MESSAGES = [
  "You've been slouching for a while",
  'Take a quick posture reset',
] as const;

const BREAK_MESSAGES = [
  'Time for a short break',
  'Stand up and reset for a minute',
] as const;

const ZERO_TOTALS = {
  GOOD_POSTURE: 0,
  MILD_SLOUCH: 0,
  DEEP_SLOUCH: 0,
  MOVING: 0,
  DETECTING: 0,
  AWAY: 0,
  NO_PERSON: 0,
} satisfies Record<LivePostureState, number>;

type BehaviorMessageKind = 'soft-posture' | 'strong-posture' | 'break';

export type BehaviorMetrics = {
  totalSessionDurationSec: number;
  totalGoodPostureSec: number;
  totalSlouchSec: number;
  breakCount: number;
  nudgeCount: number;
  goodPosturePercent: number;
  longestSlouchStreakSec: number;
  currentState: LivePostureState | null;
  currentStateDurationSec: number;
};

export type BehaviorContextSnapshot = {
  sittingBoutDurationSec: number;
  slouchDurationSec: number;
  mildSlouchDurationSec: number;
  deepSlouchDurationSec: number;
  awayDurationSec: number;
  timeSinceLastBreakSec: number | null;
  lastReminderAt: number | null;
};

export type BehaviorEngineState = {
  sessionStartedAt: number | null;
  lastProcessedAt: number | null;
  currentState: LivePostureState | null;
  currentStateStartedAt: number | null;
  totalsMs: Record<LivePostureState, number>;
  currentSittingStartedAt: number | null;
  currentSlouchStartedAt: number | null;
  mildSlouchStartedAt: number | null;
  deepSlouchStartedAt: number | null;
  awayStartedAt: number | null;
  lastBreakEndedAt: number | null;
  breakRecordedForCurrentAway: boolean;
  breakCount: number;
  nudgeCount: number;
  longestSlouchStreakMs: number;
  lastReminderAt: number | null;
  cooldowns: {
    softPostureUntil: number | null;
    strongPostureUntil: number | null;
    breakUntil: number | null;
  };
  messageCursor: Record<BehaviorMessageKind, number>;
  activeReminder: ActiveReminder | null;
  recentReminderHistory: Array<{
    type: ActiveReminder['type'];
    triggeredAt: number;
    message: string;
  }>;
};

export type BehaviorEngineInput = {
  timestamp: number;
  displayState: LivePostureState;
  frameQualityState: FrameQualityState;
  settings: ReminderSettings;
};

export type BehaviorEngineAdvanceResult = {
  state: BehaviorEngineState;
  triggeredReminder: ActiveReminder | null;
  breakDetected: boolean;
  shouldEndSession: boolean;
  metrics: BehaviorMetrics;
  contextSnapshot: BehaviorContextSnapshot;
};

export function createBehaviorEngineState(): BehaviorEngineState {
  return {
    sessionStartedAt: null,
    lastProcessedAt: null,
    currentState: null,
    currentStateStartedAt: null,
    totalsMs: { ...ZERO_TOTALS },
    currentSittingStartedAt: null,
    currentSlouchStartedAt: null,
    mildSlouchStartedAt: null,
    deepSlouchStartedAt: null,
    awayStartedAt: null,
    lastBreakEndedAt: null,
    breakRecordedForCurrentAway: false,
    breakCount: 0,
    nudgeCount: 0,
    longestSlouchStreakMs: 0,
    lastReminderAt: null,
    cooldowns: {
      softPostureUntil: null,
      strongPostureUntil: null,
      breakUntil: null,
    },
    messageCursor: {
      'soft-posture': 0,
      'strong-posture': 0,
      break: 0,
    },
    activeReminder: null,
    recentReminderHistory: [],
  };
}

export function advanceBehaviorEngine(
  previousState: BehaviorEngineState,
  input: BehaviorEngineInput,
): BehaviorEngineAdvanceResult {
  const nextState = cloneBehaviorEngineState(previousState);
  const { timestamp, displayState, frameQualityState, settings } = input;

  if (nextState.sessionStartedAt === null) {
    nextState.sessionStartedAt = timestamp;
  }

  if (nextState.currentState === null) {
    nextState.currentState = displayState;
    nextState.currentStateStartedAt = timestamp;
  }

  if (nextState.lastProcessedAt !== null && nextState.currentState !== null) {
    const deltaMs = Math.max(timestamp - nextState.lastProcessedAt, 0);
    nextState.totalsMs[nextState.currentState] += deltaMs;
  }

  if (nextState.currentState !== displayState) {
    nextState.currentState = displayState;
    nextState.currentStateStartedAt = timestamp;
  }

  updateStateTimers(nextState, displayState, frameQualityState, timestamp);

  let breakDetected = false;
  const awayDurationMs = getDurationMs(nextState.awayStartedAt, timestamp);
  if (
    nextState.awayStartedAt !== null &&
    !nextState.breakRecordedForCurrentAway &&
    awayDurationMs >= BREAK_DETECTION_MS
  ) {
    nextState.breakRecordedForCurrentAway = true;
    nextState.breakCount += 1;
    nextState.lastBreakEndedAt = timestamp;
    nextState.currentSittingStartedAt = null;
    nextState.currentSlouchStartedAt = null;
    nextState.mildSlouchStartedAt = null;
    nextState.deepSlouchStartedAt = null;
    nextState.cooldowns.softPostureUntil = null;
    nextState.cooldowns.strongPostureUntil = null;
    breakDetected = true;
  }

  if (
    shouldClearActiveReminder(
      nextState.activeReminder,
      displayState,
      frameQualityState,
    )
  ) {
    nextState.activeReminder = null;
  }

  const eligibleReminder =
    settings.enabled &&
    isWithinWorkingHours(
      settings.workingHoursStart,
      settings.workingHoursEnd,
      timestamp,
    )
      ? maybeCreateReminder(nextState, input)
      : null;

  if (eligibleReminder) {
    nextState.activeReminder = eligibleReminder;
    nextState.nudgeCount += 1;
    nextState.lastReminderAt = timestamp;
    nextState.recentReminderHistory = [
      ...nextState.recentReminderHistory,
      {
        type: eligibleReminder.type,
        triggeredAt: eligibleReminder.triggeredAt,
        message: eligibleReminder.message,
      },
    ].slice(-MAX_HISTORY_ENTRIES);
  }

  nextState.lastProcessedAt = timestamp;

  return {
    state: nextState,
    triggeredReminder: eligibleReminder,
    breakDetected,
    shouldEndSession: awayDurationMs >= LONG_AWAY_SESSION_END_MS,
    metrics: materializeBehaviorMetrics(nextState, timestamp),
    contextSnapshot: materializeBehaviorContext(nextState, timestamp),
  };
}

export function dismissBehaviorReminder(
  previousState: BehaviorEngineState,
): BehaviorEngineState {
  if (!previousState.activeReminder) {
    return previousState;
  }

  return {
    ...previousState,
    activeReminder: null,
  };
}

export function materializeBehaviorMetrics(
  state: BehaviorEngineState,
  timestamp: number,
): BehaviorMetrics {
  const sessionDurationSec =
    state.sessionStartedAt === null
      ? 0
      : Math.max(Math.round((timestamp - state.sessionStartedAt) / 1000), 0);
  const currentStateDurationSec =
    state.currentStateStartedAt === null
      ? 0
      : Math.max(Math.round((timestamp - state.currentStateStartedAt) / 1000), 0);
  const seatedTrackedMs =
    state.totalsMs.GOOD_POSTURE +
    state.totalsMs.MILD_SLOUCH +
    state.totalsMs.DEEP_SLOUCH;

  return {
    totalSessionDurationSec: sessionDurationSec,
    totalGoodPostureSec: Math.round(state.totalsMs.GOOD_POSTURE / 1000),
    totalSlouchSec: Math.round(
      (state.totalsMs.MILD_SLOUCH + state.totalsMs.DEEP_SLOUCH) / 1000,
    ),
    breakCount: state.breakCount,
    nudgeCount: state.nudgeCount,
    goodPosturePercent:
      seatedTrackedMs > 0
        ? Math.round((state.totalsMs.GOOD_POSTURE / seatedTrackedMs) * 100)
        : 0,
    longestSlouchStreakSec: Math.round(
      Math.max(
        state.longestSlouchStreakMs,
        getDurationMs(state.currentSlouchStartedAt, timestamp),
      ) / 1000,
    ),
    currentState: state.currentState,
    currentStateDurationSec,
  };
}

export function materializeBehaviorContext(
  state: BehaviorEngineState,
  timestamp: number,
): BehaviorContextSnapshot {
  return {
    sittingBoutDurationSec:
      state.currentSittingStartedAt === null
        ? 0
        : Math.max(
            Math.round((timestamp - state.currentSittingStartedAt) / 1000),
            0,
          ),
    slouchDurationSec: Math.max(
      getDurationSec(state.mildSlouchStartedAt, timestamp),
      getDurationSec(state.deepSlouchStartedAt, timestamp),
    ),
    mildSlouchDurationSec: getDurationSec(state.mildSlouchStartedAt, timestamp),
    deepSlouchDurationSec: getDurationSec(state.deepSlouchStartedAt, timestamp),
    awayDurationSec: getDurationSec(state.awayStartedAt, timestamp),
    timeSinceLastBreakSec:
      state.lastBreakEndedAt === null
        ? null
        : Math.max(Math.round((timestamp - state.lastBreakEndedAt) / 1000), 0),
    lastReminderAt: state.lastReminderAt,
  };
}

function updateStateTimers(
  state: BehaviorEngineState,
  displayState: LivePostureState,
  frameQualityState: FrameQualityState,
  timestamp: number,
) {
  const isReliableForPosture = frameQualityState !== 'POOR';

  if (isSittingState(displayState) && state.currentSittingStartedAt === null) {
    state.currentSittingStartedAt = timestamp;
  }

  if (!isSittingState(displayState)) {
    state.currentSittingStartedAt = null;
  }

  if (
    (displayState === 'MILD_SLOUCH' || displayState === 'DEEP_SLOUCH') &&
    isReliableForPosture &&
    state.currentSlouchStartedAt === null
  ) {
    state.currentSlouchStartedAt = timestamp;
  }

  if (displayState === 'MILD_SLOUCH' && isReliableForPosture) {
    if (state.mildSlouchStartedAt === null) {
      state.mildSlouchStartedAt = timestamp;
    }
  } else {
    state.mildSlouchStartedAt = null;
  }

  if (displayState === 'DEEP_SLOUCH' && isReliableForPosture) {
    if (state.deepSlouchStartedAt === null) {
      state.deepSlouchStartedAt = timestamp;
    }
  } else {
    state.deepSlouchStartedAt = null;
  }

  if (displayState === 'AWAY' || displayState === 'NO_PERSON') {
    if (state.awayStartedAt === null) {
      state.awayStartedAt = timestamp;
      state.breakRecordedForCurrentAway = false;
    }
  } else {
    state.awayStartedAt = null;
    state.breakRecordedForCurrentAway = false;
  }

  if (
    displayState === 'GOOD_POSTURE' ||
    displayState === 'MOVING' ||
    displayState === 'DETECTING' ||
    displayState === 'AWAY' ||
    displayState === 'NO_PERSON' ||
    frameQualityState === 'POOR'
  ) {
    finalizeSlouchStreak(state, timestamp);
    state.mildSlouchStartedAt = null;
    state.deepSlouchStartedAt = null;
  }
}

function maybeCreateReminder(
  state: BehaviorEngineState,
  input: BehaviorEngineInput,
): ActiveReminder | null {
  const { timestamp, displayState, frameQualityState, settings } = input;
  const sessionAgeMs =
    state.sessionStartedAt === null
      ? 0
      : Math.max(timestamp - state.sessionStartedAt, 0);

  if (state.activeReminder) {
    return null;
  }

  if (displayState === 'DEEP_SLOUCH') {
    const deepDurationMs = getDurationMs(state.deepSlouchStartedAt, timestamp);
    if (
      frameQualityState !== 'POOR' &&
      deepDurationMs >= DEEP_SLOUCH_THRESHOLD_MS &&
      sessionAgeMs >= DEEP_SLOUCH_THRESHOLD_MS &&
      isCooldownExpired(state.cooldowns.strongPostureUntil, timestamp)
    ) {
      return createReminder(state, {
        timestamp,
        type: 'POSTURE_NUDGE',
        severity: 'strong',
        messageKind: 'strong-posture',
        messagePool: STRONG_POSTURE_MESSAGES,
        cooldownMs: POSTURE_STRONG_COOLDOWN_MS,
        title: 'Posture reset',
        currentState: displayState,
      });
    }
  }

  if (displayState === 'MILD_SLOUCH') {
    const mildDurationMs = getDurationMs(state.mildSlouchStartedAt, timestamp);
    if (
      frameQualityState !== 'POOR' &&
      mildDurationMs >= MILD_SLOUCH_THRESHOLD_MS &&
      sessionAgeMs >= MILD_SLOUCH_THRESHOLD_MS &&
      isCooldownExpired(state.cooldowns.softPostureUntil, timestamp)
    ) {
      return createReminder(state, {
        timestamp,
        type: 'POSTURE_NUDGE',
        severity: 'soft',
        messageKind: 'soft-posture',
        messagePool: SOFT_POSTURE_MESSAGES,
        cooldownMs: POSTURE_SOFT_COOLDOWN_MS,
        title: 'Posture reminder',
        currentState: displayState,
      });
    }
  }

  const sittingThresholdMs =
    (settings.minimumSittingBeforeReminderMin || BREAK_THRESHOLD_FALLBACK_MIN) *
    60 *
    1000;
  const sittingDurationMs = getDurationMs(state.currentSittingStartedAt, timestamp);

  if (
    isSittingState(displayState) &&
    sittingDurationMs >= sittingThresholdMs &&
    sessionAgeMs >= sittingThresholdMs &&
    isCooldownExpired(state.cooldowns.breakUntil, timestamp)
  ) {
    return createReminder(state, {
      timestamp,
      type: 'BREAK_NUDGE',
      severity: 'balanced',
      messageKind: 'break',
      messagePool: BREAK_MESSAGES,
      cooldownMs: BREAK_COOLDOWN_MS,
      title: 'Break suggestion',
      currentState: displayState,
    });
  }

  return null;
}

function createReminder(
  state: BehaviorEngineState,
  options: {
    timestamp: number;
    type: ActiveReminder['type'];
    severity: 'soft' | 'strong' | 'balanced';
    messageKind: BehaviorMessageKind;
    messagePool: readonly string[];
    cooldownMs: number;
    title: string;
    currentState: LivePostureState;
  },
): ActiveReminder {
  const {
    timestamp,
    type,
    severity,
    messageKind,
    messagePool,
    cooldownMs,
    title,
    currentState,
  } = options;
  const messageIndex = state.messageCursor[messageKind] % messagePool.length;
  const message = messagePool[messageIndex];
  state.messageCursor[messageKind] += 1;

  if (severity === 'soft') {
    state.cooldowns.softPostureUntil = timestamp + cooldownMs;
  }

  if (severity === 'strong') {
    state.cooldowns.strongPostureUntil = timestamp + cooldownMs;
  }

  if (type === 'BREAK_NUDGE') {
    state.cooldowns.breakUntil = timestamp + cooldownMs;
  }

  return {
    id: `reminder-${type.toLowerCase()}-${timestamp}`,
    type,
    title,
    message,
    cooldownExpiresAt: timestamp + cooldownMs,
    priority: severity === 'strong' ? 3 : type === 'BREAK_NUDGE' ? 2 : 1,
    context: {
      currentState,
      sittingBoutDurationSec: getDurationSec(state.currentSittingStartedAt, timestamp),
      slouchDurationSec: Math.max(
        getDurationSec(state.mildSlouchStartedAt, timestamp),
        getDurationSec(state.deepSlouchStartedAt, timestamp),
      ),
      timeSinceLastBreakSec:
        state.lastBreakEndedAt === null
          ? null
          : Math.max(Math.round((timestamp - state.lastBreakEndedAt) / 1000), 0),
    },
    triggeredAt: timestamp,
    severity,
    autoDismissAt: timestamp + AUTO_DISMISS_MS,
  };
}

function cloneBehaviorEngineState(
  state: BehaviorEngineState,
): BehaviorEngineState {
  return {
    ...state,
    totalsMs: {
      ...state.totalsMs,
    },
    cooldowns: {
      ...state.cooldowns,
    },
    messageCursor: {
      ...state.messageCursor,
    },
    recentReminderHistory: [...state.recentReminderHistory],
  };
}

function finalizeSlouchStreak(
  state: BehaviorEngineState,
  timestamp: number,
) {
  if (state.currentSlouchStartedAt === null) {
    return;
  }

  state.longestSlouchStreakMs = Math.max(
    state.longestSlouchStreakMs,
    getDurationMs(state.currentSlouchStartedAt, timestamp),
  );
  state.currentSlouchStartedAt = null;
}

function shouldClearActiveReminder(
  reminder: ActiveReminder | null,
  displayState: LivePostureState,
  frameQualityState: FrameQualityState,
) {
  if (!reminder) {
    return false;
  }

  if (reminder.type === 'BREAK_NUDGE') {
    return displayState === 'AWAY' || displayState === 'NO_PERSON';
  }

  return (
    frameQualityState === 'POOR' ||
    displayState === 'GOOD_POSTURE' ||
    displayState === 'DETECTING' ||
    displayState === 'AWAY' ||
    displayState === 'NO_PERSON' ||
    displayState === 'MOVING'
  );
}

function isSittingState(state: LivePostureState) {
  return (
    state === 'GOOD_POSTURE' ||
    state === 'MILD_SLOUCH' ||
    state === 'DEEP_SLOUCH' ||
    state === 'MOVING'
  );
}

function isCooldownExpired(cooldownUntil: number | null, timestamp: number) {
  return cooldownUntil === null || timestamp >= cooldownUntil;
}

function getDurationMs(startedAt: number | null, timestamp: number) {
  return startedAt === null ? 0 : Math.max(timestamp - startedAt, 0);
}

function getDurationSec(startedAt: number | null, timestamp: number) {
  return Math.max(Math.round(getDurationMs(startedAt, timestamp) / 1000), 0);
}

function isWithinWorkingHours(
  start: string | undefined,
  end: string | undefined,
  timestamp: number,
) {
  if (!start || !end) {
    return true;
  }

  const startTime = parseClockTime(start);
  const endTime = parseClockTime(end);

  if (!startTime || !endTime) {
    return true;
  }

  const current = new Date(timestamp);
  const currentMinutes = current.getHours() * 60 + current.getMinutes();
  const startMinutes = startTime.hour * 60 + startTime.minute;
  const endMinutes = endTime.hour * 60 + endTime.minute;

  if (startMinutes <= endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  }

  return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
}

function parseClockTime(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value.trim());

  if (!match) {
    return null;
  }

  return {
    hour: Number(match[1]),
    minute: Number(match[2]),
  };
}
