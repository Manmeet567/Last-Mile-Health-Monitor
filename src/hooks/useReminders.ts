import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReminderSettings, PostureEvent } from '@/types/domain';
import type { ActiveReminder, ReminderDecision, ReminderHistoryEntry } from '@/core/reminders/reminder.types';
import { evaluateReminder } from '@/core/reminders/reminder-rules';
import { createEmptyDailyMetrics } from '@/core/metrics/session-aggregator';
import { getDailyMetricsByDateKey, saveDailyMetrics } from '@/storage/repositories/daily-metrics.repository';
import { savePostureEvents } from '@/storage/repositories/events.repository';
import { toDateKey } from '@/utils/date';
import type { LivePostureState } from '@/types/domain';

const SITTING_STATES = new Set<LivePostureState>(['GOOD_POSTURE', 'MILD_SLOUCH', 'DEEP_SLOUCH', 'MOVING']);
const SLOUCH_STATES = new Set<LivePostureState>(['MILD_SLOUCH', 'DEEP_SLOUCH']);
const BREAK_STATES = new Set<LivePostureState>(['AWAY', 'NO_PERSON']);

type UseRemindersOptions = {
  enabled: boolean;
  settings: ReminderSettings;
  postureState: LivePostureState;
  latestTimestamp: number | null;
  sessionId: string | null;
};

export function useReminders(options: UseRemindersOptions) {
  const { enabled, settings, postureState, latestTimestamp, sessionId } = options;
  const mountedRef = useRef(true);
  const previousStateRef = useRef<LivePostureState>(postureState);
  const currentSittingBoutStartedAtRef = useRef<number | null>(null);
  const currentSlouchStartedAtRef = useRef<number | null>(null);
  const lastBreakAtRef = useRef<number | null>(null);
  const lastReminderAtRef = useRef<number | null>(null);
  const reminderHistoryRef = useRef<ReminderHistoryEntry[]>([]);
  const pendingReminderEventsRef = useRef<PostureEvent[]>([]);
  const persistInFlightRef = useRef(false);
  const activeReminderRef = useRef<ActiveReminder | null>(null);
  const [activeReminder, setActiveReminder] = useState<ActiveReminder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPersisting, setIsPersisting] = useState(false);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      void flushPendingReminderPersistence();
    };
  }, []);

  const contextSnapshot = useMemo(() => {
    if (latestTimestamp === null) {
      return {
        sittingBoutDurationSec: 0,
        slouchDurationSec: 0,
        timeSinceLastBreakSec: null,
        cooldownRemainingSec: 0,
        lastReminderAt: lastReminderAtRef.current,
      };
    }

    const sittingBoutDurationSec = currentSittingBoutStartedAtRef.current
      ? Math.max(Math.round((latestTimestamp - currentSittingBoutStartedAtRef.current) / 1000), 0)
      : 0;
    const slouchDurationSec = currentSlouchStartedAtRef.current
      ? Math.max(Math.round((latestTimestamp - currentSlouchStartedAtRef.current) / 1000), 0)
      : 0;
    const timeSinceLastBreakSec = lastBreakAtRef.current
      ? Math.max(Math.round((latestTimestamp - lastBreakAtRef.current) / 1000), 0)
      : null;
    const cooldownRemainingSec = lastReminderAtRef.current
      ? Math.max(
          Math.round(
            (lastReminderAtRef.current + settings.reminderCooldownMin * 60 * 1000 - latestTimestamp) / 1000,
          ),
          0,
        )
      : 0;

    return {
      sittingBoutDurationSec,
      slouchDurationSec,
      timeSinceLastBreakSec,
      cooldownRemainingSec,
      lastReminderAt: lastReminderAtRef.current,
    };
  }, [latestTimestamp, settings.reminderCooldownMin]);

  useEffect(() => {
    activeReminderRef.current = activeReminder;
  }, [activeReminder]);

  useEffect(() => {
    if (!enabled || latestTimestamp === null) {
      void flushPendingReminderPersistence();
      if (!enabled && mountedRef.current) {
        setActiveReminder(null);
      }
      return;
    }

    updateReminderDurations(postureState, latestTimestamp);
    void flushPendingReminderPersistence();

    if (!settings.enabled) {
      if (mountedRef.current) {
        setActiveReminder(null);
      }
      return;
    }

    if (shouldAutoClearReminder(postureState) && mountedRef.current) {
      setActiveReminder(null);
    }

    const sittingBoutDurationSec = currentSittingBoutStartedAtRef.current
      ? Math.max(Math.round((latestTimestamp - currentSittingBoutStartedAtRef.current) / 1000), 0)
      : 0;
    const slouchDurationSec = currentSlouchStartedAtRef.current
      ? Math.max(Math.round((latestTimestamp - currentSlouchStartedAtRef.current) / 1000), 0)
      : 0;
    const timeSinceLastBreakSec = lastBreakAtRef.current
      ? Math.max(Math.round((latestTimestamp - lastBreakAtRef.current) / 1000), 0)
      : null;
    const timeSinceLastReminderSec = lastReminderAtRef.current
      ? Math.max(Math.round((latestTimestamp - lastReminderAtRef.current) / 1000), 0)
      : null;

    reminderHistoryRef.current = reminderHistoryRef.current.filter(
      (entry) => latestTimestamp - entry.timestamp <= 60 * 60 * 1000,
    );

    const decision = evaluateReminder({
      currentState: postureState,
      sittingBoutDurationSec,
      slouchDurationSec,
      timeSinceLastBreakSec,
      timeSinceLastReminderSec,
      recentReminderHistory: reminderHistoryRef.current,
      now: latestTimestamp,
      settings,
    });

    if (!decision) {
      return;
    }

    if (activeReminderRef.current && activeReminderRef.current.type === decision.type) {
      return;
    }

    triggerReminder(decision, latestTimestamp);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, latestTimestamp, postureState, settings]);

  return {
    activeReminder,
    dismissReminder,
    contextSnapshot,
    isPersisting,
    error,
  };

  function updateReminderDurations(nextState: LivePostureState, timestamp: number) {
    const previousState = previousStateRef.current;

    if (!SITTING_STATES.has(previousState) && SITTING_STATES.has(nextState)) {
      currentSittingBoutStartedAtRef.current = timestamp;
    }

    if (SITTING_STATES.has(previousState) && !SITTING_STATES.has(nextState)) {
      currentSittingBoutStartedAtRef.current = null;
    }

    if (!SLOUCH_STATES.has(previousState) && SLOUCH_STATES.has(nextState)) {
      currentSlouchStartedAtRef.current = timestamp;
    }

    if (SLOUCH_STATES.has(previousState) && !SLOUCH_STATES.has(nextState)) {
      currentSlouchStartedAtRef.current = null;
    }

    if (BREAK_STATES.has(previousState) && !BREAK_STATES.has(nextState)) {
      lastBreakAtRef.current = timestamp;
    }

    if (previousState === nextState) {
      if (currentSittingBoutStartedAtRef.current === null && SITTING_STATES.has(nextState)) {
        currentSittingBoutStartedAtRef.current = timestamp;
      }

      if (currentSlouchStartedAtRef.current === null && SLOUCH_STATES.has(nextState)) {
        currentSlouchStartedAtRef.current = timestamp;
      }
    }

    previousStateRef.current = nextState;
  }

  function triggerReminder(decision: ReminderDecision, triggeredAt: number) {
    const reminderId = `reminder-${decision.type.toLowerCase()}-${triggeredAt}`;
    const nextReminder: ActiveReminder = {
      ...decision,
      id: reminderId,
      triggeredAt,
    };

    if (mountedRef.current) {
      setActiveReminder(nextReminder);
    }
    lastReminderAtRef.current = triggeredAt;
    reminderHistoryRef.current = [
      ...reminderHistoryRef.current,
      {
        type: decision.type,
        timestamp: triggeredAt,
      },
    ].slice(-12);

    pendingReminderEventsRef.current.push(
      createReminderEvent({
        reminder: nextReminder,
        timestamp: triggeredAt,
        sessionId,
      }),
    );

    void flushPendingReminderPersistence();
  }

  function dismissReminder() {
    if (mountedRef.current) {
      setActiveReminder(null);
    }
  }

  async function flushPendingReminderPersistence() {
    if (persistInFlightRef.current || pendingReminderEventsRef.current.length === 0) {
      return;
    }

    persistInFlightRef.current = true;
    if (mountedRef.current) {
      setIsPersisting(true);
    }

    try {
      while (pendingReminderEventsRef.current.length > 0) {
        const nextEvent = pendingReminderEventsRef.current[0];
        const dateKey = toDateKey(nextEvent.timestamp);
        const existingMetrics = await getDailyMetricsByDateKey(dateKey);
        const nextMetrics = existingMetrics ?? createEmptyDailyMetrics(dateKey);

        await Promise.all([
          savePostureEvents([nextEvent]),
          saveDailyMetrics({
            ...nextMetrics,
            remindersTriggered: nextMetrics.remindersTriggered + 1,
          }),
        ]);

        pendingReminderEventsRef.current.shift();
      }

      if (mountedRef.current) {
        setError(null);
      }
    } catch (nextError) {
      if (mountedRef.current) {
        setError(nextError instanceof Error ? nextError.message : 'Unable to persist reminder activity locally.');
      }
    } finally {
      persistInFlightRef.current = false;
      if (mountedRef.current) {
        setIsPersisting(false);
      }
    }
  }
}

function createReminderEvent(options: {
  reminder: ActiveReminder;
  timestamp: number;
  sessionId: string | null;
}): PostureEvent {
  const { reminder, timestamp, sessionId } = options;

  return {
    id: `${reminder.id}-event`,
    type: 'REMINDER_TRIGGERED',
    timestamp,
    metadata: {
      reminderType: reminder.type,
      title: reminder.title,
      currentState: reminder.context.currentState,
      sittingBoutDurationSec: reminder.context.sittingBoutDurationSec,
      slouchDurationSec: reminder.context.slouchDurationSec,
      cooldownExpiresAt: reminder.cooldownExpiresAt,
      sessionId,
    },
  };
}

function shouldAutoClearReminder(state: LivePostureState) {
  return (
    state === 'GOOD_POSTURE' ||
    state === 'DETECTING' ||
    state === 'AWAY' ||
    state === 'NO_PERSON' ||
    state === 'MOVING'
  );
}
