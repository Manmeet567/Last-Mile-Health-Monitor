import { useEffect, useRef, useState } from 'react';
import { createEmptyDailyMetrics } from '@/core/metrics/session-aggregator';
import type { ActiveReminder } from '@/core/reminders/reminder.types';
import type { FrameQualityState } from '@/core/processing/processing.types';
import {
  advanceBehaviorEngine,
  createBehaviorEngineState,
  dismissBehaviorReminder,
  materializeBehaviorContext,
  materializeBehaviorMetrics,
  type BehaviorEngineState,
  LONG_AWAY_SESSION_END_MS,
} from '@/features/posture/behavior-engine';
import { buildSessionIntelligence } from '@/features/posture/session-intelligence';
import { getDailyMetricsByDateKey, saveDailyMetrics } from '@/storage/repositories/daily-metrics.repository';
import { savePostureEvents } from '@/storage/repositories/events.repository';
import { toDateKey } from '@/utils/date';
import type { LivePostureState, PostureEvent, ReminderSettings } from '@/types/domain';

const AUTO_DISMISS_MS = 5_000;

type UseRemindersOptions = {
  enabled: boolean;
  settings: ReminderSettings;
  postureState: LivePostureState;
  latestTimestamp: number | null;
  sessionId: string | null;
  frameQualityState?: FrameQualityState;
};

export function useReminders(options: UseRemindersOptions) {
  const {
    enabled,
    settings,
    postureState,
    latestTimestamp,
    sessionId,
    frameQualityState = 'GOOD',
  } = options;
  const mountedRef = useRef(true);
  const engineRef = useRef<BehaviorEngineState>(createBehaviorEngineState());
  const pendingReminderEventsRef = useRef<PostureEvent[]>([]);
  const persistInFlightRef = useRef(false);
  const pausedForLongAwayRef = useRef(false);
  const [activeReminder, setActiveReminder] = useState<ActiveReminder | null>(null);
  const [isPersisting, setIsPersisting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tickState, setTickState] = useState(() => ({
    contextSnapshot: materializeBehaviorContext(engineRef.current, Date.now()),
    sessionMetrics: materializeBehaviorMetrics(engineRef.current, Date.now()),
    sessionSummary: buildSessionIntelligence(engineRef.current, Date.now()),
    sessionEndAt: null as number | null,
    sessionEligible: true,
  }));
  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      void flushPendingReminderPersistence();
    };
  }, []);

  useEffect(() => {
    if (!enabled || latestTimestamp === null) {
      if (!enabled) {
        engineRef.current = createBehaviorEngineState();
        pausedForLongAwayRef.current = false;
        if (mountedRef.current) {
          setActiveReminder(null);
          setTickState((current) => ({
            ...current,
            sessionEndAt: null,
            sessionEligible: true,
          }));
        }
      }

      void flushPendingReminderPersistence();
      return;
    }

    if (pausedForLongAwayRef.current && (postureState === 'AWAY' || postureState === 'NO_PERSON')) {
      if (mountedRef.current) {
        setTickState((current) => ({
          ...current,
          contextSnapshot: {
            ...current.contextSnapshot,
            awayDurationSec: Math.max(
              current.contextSnapshot.awayDurationSec,
              Math.round(LONG_AWAY_SESSION_END_MS / 1000),
            ),
          },
          sessionEligible: false,
        }));
      }
      return;
    }

    if (pausedForLongAwayRef.current && postureState !== 'AWAY' && postureState !== 'NO_PERSON') {
      pausedForLongAwayRef.current = false;
      engineRef.current = createBehaviorEngineState();
    }

    const result = advanceBehaviorEngine(engineRef.current, {
      timestamp: latestTimestamp,
      displayState: postureState,
      frameQualityState,
      settings,
    });

    engineRef.current = result.state;

    if (mountedRef.current) {
      setActiveReminder(result.state.activeReminder);
      setTickState({
        contextSnapshot: result.contextSnapshot,
        sessionMetrics: result.metrics,
        sessionSummary: buildSessionIntelligence(result.state, latestTimestamp),
        sessionEndAt: result.shouldEndSession ? latestTimestamp : null,
        sessionEligible: !result.shouldEndSession,
      });
    }

    if (result.shouldEndSession) {
      pausedForLongAwayRef.current = true;
      engineRef.current = createBehaviorEngineState();
      if (mountedRef.current) {
        setActiveReminder(null);
      }
    }

    if (result.triggeredReminder) {
      pendingReminderEventsRef.current.push(
        createReminderEvent({
          reminder: result.triggeredReminder,
          timestamp: result.triggeredReminder.triggeredAt,
          sessionId,
        }),
      );
      void flushPendingReminderPersistence();
    }
  }, [enabled, frameQualityState, latestTimestamp, postureState, sessionId, settings]);

  useEffect(() => {
    if (!activeReminder) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      dismissReminder();
    }, AUTO_DISMISS_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [activeReminder]);

  return {
    activeReminder,
    dismissReminder,
    contextSnapshot: tickState.contextSnapshot,
    sessionMetrics: tickState.sessionMetrics,
    sessionSummary: tickState.sessionSummary,
    sessionEndAt: tickState.sessionEndAt,
    sessionEligible: tickState.sessionEligible,
    isPersisting,
    error,
  };

  function dismissReminder() {
    engineRef.current = dismissBehaviorReminder(engineRef.current);

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
        setError(
          nextError instanceof Error
            ? nextError.message
            : 'Unable to persist local nudge activity.',
        );
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
      message: reminder.message,
      severity: reminder.severity ?? 'balanced',
      currentState: reminder.context.currentState,
      sittingBoutDurationSec: reminder.context.sittingBoutDurationSec,
      slouchDurationSec: reminder.context.slouchDurationSec,
      cooldownExpiresAt: reminder.cooldownExpiresAt,
      sessionId,
    },
  };
}
