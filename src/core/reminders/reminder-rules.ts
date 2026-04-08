import type { LivePostureState } from '@/types/domain';
import type { ReminderContext, ReminderDecision, ReminderHistoryEntry } from '@/core/reminders/reminder.types';

const MAX_REMINDERS_PER_HOUR = 3;
const RECOVERY_WINDOW_MS = 20 * 60 * 1000;
const RECOVERY_TRIGGER_COUNT = 2;
const MIN_DEEP_SLOUCH_NUDGE_SEC = 60;

export function evaluateReminder(context: ReminderContext): ReminderDecision | null {
  const { settings, now } = context;

  if (!settings.enabled) {
    return null;
  }

  if (!isReminderEligibleState(context.currentState)) {
    return null;
  }

  if (!isWithinWorkingHours(settings.workingHoursStart, settings.workingHoursEnd, now)) {
    return null;
  }

  const cooldownSec = settings.reminderCooldownMin * 60;
  if (context.timeSinceLastReminderSec !== null && context.timeSinceLastReminderSec < cooldownSec) {
    return null;
  }

  if (countRecentReminders(context.recentReminderHistory, now) >= MAX_REMINDERS_PER_HOUR) {
    return null;
  }

  const recoveryCandidate = maybeCreateRecoveryNudge(context);
  if (recoveryCandidate) {
    return recoveryCandidate;
  }

  const deepSlouchCandidate = maybeCreateDeepPostureNudge(context);
  if (deepSlouchCandidate) {
    return deepSlouchCandidate;
  }

  const breakCandidate = maybeCreateBreakNudge(context);
  if (breakCandidate) {
    return breakCandidate;
  }

  return maybeCreateMildPostureNudge(context);
}

function maybeCreateRecoveryNudge(context: ReminderContext): ReminderDecision | null {
  const repeatedPostureNudges = context.recentReminderHistory.filter(
    (entry) =>
      entry.type === 'POSTURE_NUDGE' &&
      context.now - entry.timestamp <= RECOVERY_WINDOW_MS,
  ).length;

  if (!isSlouchState(context.currentState) || repeatedPostureNudges < RECOVERY_TRIGGER_COUNT) {
    return null;
  }

  if (context.slouchDurationSec < Math.max(Math.floor(context.settings.slouchThresholdBeforeReminderSec / 2), 60)) {
    return null;
  }

  return createReminderDecision({
    type: 'RECOVERY_NUDGE',
    title: 'A reset might help',
    message:
      'Your posture has drifted a few times in this stretch. A quick stand, roll of the shoulders, or short reset could help.',
    context,
    priority: 3,
  });
}

function maybeCreateDeepPostureNudge(context: ReminderContext): ReminderDecision | null {
  if (context.currentState !== 'DEEP_SLOUCH') {
    return null;
  }

  if (context.slouchDurationSec < Math.max(Math.floor(context.settings.slouchThresholdBeforeReminderSec / 2), MIN_DEEP_SLOUCH_NUDGE_SEC)) {
    return null;
  }

  return createReminderDecision({
    type: 'POSTURE_NUDGE',
    title: 'Try a posture reset',
    message:
      'You have been leaning forward for a while. A small reset now could make the next stretch more comfortable.',
    context,
    priority: 4,
  });
}

function maybeCreateBreakNudge(context: ReminderContext): ReminderDecision | null {
  const breakThresholdSec = context.settings.minimumSittingBeforeReminderMin * 60;

  if (context.sittingBoutDurationSec < breakThresholdSec) {
    return null;
  }

  if (context.timeSinceLastBreakSec !== null && context.timeSinceLastBreakSec < breakThresholdSec) {
    return null;
  }

  return createReminderDecision({
    type: 'BREAK_NUDGE',
    title: 'A quick break could help',
    message:
      'You have been sitting for a long stretch. If you can, a short stand or walk would be a good reset point.',
    context,
    priority: 2,
  });
}

function maybeCreateMildPostureNudge(context: ReminderContext): ReminderDecision | null {
  if (!isSlouchState(context.currentState)) {
    return null;
  }

  if (context.slouchDurationSec < context.settings.slouchThresholdBeforeReminderSec) {
    return null;
  }

  return createReminderDecision({
    type: 'POSTURE_NUDGE',
    title: 'It may be a good time to straighten up',
    message:
      'You have been out of your calibrated posture range for a bit. A small posture reset might help before it becomes a habit.',
    context,
    priority: 1,
  });
}

function createReminderDecision(options: {
  type: ReminderDecision['type'];
  title: string;
  message: string;
  context: ReminderContext;
  priority: number;
}): ReminderDecision {
  const { type, title, message, context, priority } = options;

  return {
    type,
    title,
    message,
    cooldownExpiresAt: context.now + context.settings.reminderCooldownMin * 60 * 1000,
    priority,
    context: {
      currentState: context.currentState,
      sittingBoutDurationSec: context.sittingBoutDurationSec,
      slouchDurationSec: context.slouchDurationSec,
      timeSinceLastBreakSec: context.timeSinceLastBreakSec,
    },
  };
}

function countRecentReminders(history: ReminderHistoryEntry[], now: number) {
  return history.filter((entry) => now - entry.timestamp <= 60 * 60 * 1000).length;
}

function isReminderEligibleState(state: LivePostureState) {
  return state === 'GOOD_POSTURE' || state === 'MILD_SLOUCH' || state === 'DEEP_SLOUCH';
}

function isSlouchState(state: LivePostureState) {
  return state === 'MILD_SLOUCH' || state === 'DEEP_SLOUCH';
}

function isWithinWorkingHours(start: string | undefined, end: string | undefined, timestamp: number) {
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
