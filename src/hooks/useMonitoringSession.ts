import { useEffect, useRef, useState } from 'react';
import {
  advanceSessionAccumulator,
  attachSessionMetadataToEvents,
  createSessionAccumulator,
  createSessionLifecycleEvent,
  finalizeSessionAccumulator,
  materializeDailyMetricsContributions,
  materializeMonitoringSession,
  mergeDailyMetrics,
} from '@/core/metrics/session-aggregator';
import type { MetricsSnapshot, SessionAccumulator } from '@/core/metrics/metrics.types';
import type { MonitoringSession, PostureEvent } from '@/types/domain';
import type { PostureStateSnapshot } from '@/core/state-machine/state-machine.types';
import { getDailyMetricsByDateKey, saveDailyMetrics } from '@/storage/repositories/daily-metrics.repository';
import { savePostureEvents } from '@/storage/repositories/events.repository';
import {
  getLatestCompletedMonitoringSession,
  saveMonitoringSession,
} from '@/storage/repositories/sessions.repository';
import { toDateKey } from '@/utils/date';

const SESSION_SYNC_INTERVAL_MS = 5_000;

type UseMonitoringSessionOptions = {
  enabled: boolean;
  postureSnapshot: PostureStateSnapshot;
  latestTimestamp: number | null;
};

export function useMonitoringSession(options: UseMonitoringSessionOptions) {
  const { enabled, postureSnapshot, latestTimestamp } = options;
  const accumulatorRef = useRef<SessionAccumulator | null>(null);
  const isStartingRef = useRef(false);
  const isFinalizingRef = useRef(false);
  const isPersistingEventsRef = useRef(false);
  const pendingEventsRef = useRef<PostureEvent[]>([]);
  const persistedEventIdsRef = useRef(new Set<string>());
  const mountedRef = useRef(true);
  const [state, setState] = useState<MetricsSnapshot>({
    activeSession: null,
    latestCompletedSession: null,
    todayMetrics: null,
    isPersisting: false,
    error: null,
  });

  useEffect(() => {
    mountedRef.current = true;
    void hydratePersistedMetrics();

    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled) {
      if (accumulatorRef.current) {
        void finalizeActiveSession(Date.now());
      }
      return;
    }

    if (latestTimestamp === null) {
      return;
    }

    if (!accumulatorRef.current && !isStartingRef.current) {
      void startSession(latestTimestamp, postureSnapshot.state);
    }
  }, [enabled, latestTimestamp, postureSnapshot.state]);

  useEffect(() => {
    return () => {
      if (accumulatorRef.current) {
        void finalizeActiveSession(accumulatorRef.current.lastProcessedAt || Date.now());
      }
    };
  }, []);

  useEffect(() => {
    const accumulator = accumulatorRef.current;
    if (!enabled || !accumulator || latestTimestamp === null) {
      return;
    }

    const advancedAccumulator = advanceSessionAccumulator(accumulator, {
      timestamp: latestTimestamp,
      currentState: postureSnapshot.state,
    });
    accumulatorRef.current = advancedAccumulator;

    setState((currentState) => ({
      ...currentState,
      activeSession: materializeMonitoringSession(advancedAccumulator, null, latestTimestamp),
    }));

    enqueuePendingEvents(postureSnapshot.emittedEvents);
    void flushPendingEvents(advancedAccumulator.sessionId);

    if (latestTimestamp - advancedAccumulator.lastPersistedAt >= SESSION_SYNC_INTERVAL_MS) {
      const nextAccumulator = {
        ...advancedAccumulator,
        lastPersistedAt: latestTimestamp,
      };
      accumulatorRef.current = nextAccumulator;
      void persistSessionSnapshot(materializeMonitoringSession(nextAccumulator, null, latestTimestamp));
    }
  }, [enabled, latestTimestamp, postureSnapshot.emittedEvents, postureSnapshot.state]);

  return state;

  function enqueuePendingEvents(events: PostureStateSnapshot['emittedEvents']) {
    const pendingEventIds = new Set(pendingEventsRef.current.map((event) => event.id));

    for (const event of events) {
      if (persistedEventIdsRef.current.has(event.id) || pendingEventIds.has(event.id)) {
        continue;
      }

      pendingEventsRef.current.push(event);
      pendingEventIds.add(event.id);
    }
  }

  async function hydratePersistedMetrics() {
    try {
      const [latestCompletedSession, todayMetrics] = await Promise.all([
        getLatestCompletedMonitoringSession(),
        getDailyMetricsByDateKey(toDateKey(Date.now())),
      ]);

      if (!mountedRef.current) {
        return;
      }

      setState((currentState) => ({
        ...currentState,
        latestCompletedSession: latestCompletedSession ?? null,
        todayMetrics: todayMetrics ?? null,
      }));
    } catch (error) {
      if (!mountedRef.current) {
        return;
      }

      setState((currentState) => ({
        ...currentState,
        error: error instanceof Error ? error.message : 'Unable to load persisted monitoring metrics.',
      }));
    }
  }

  async function startSession(startedAt: number, initialState: PostureStateSnapshot['state']) {
    isStartingRef.current = true;
    const sessionId = `session-${startedAt}`;
    const accumulator = createSessionAccumulator(sessionId, startedAt, initialState);
    accumulatorRef.current = accumulator;
    pendingEventsRef.current = [];
    persistedEventIdsRef.current.clear();

    const initialSession = materializeMonitoringSession(accumulator, null, startedAt);
    const startedEvent = createSessionLifecycleEvent({
      sessionId,
      timestamp: startedAt,
      type: 'SESSION_STARTED',
      metadata: {
        initialState,
      },
    });

    if (mountedRef.current) {
      setState((currentState) => ({
        ...currentState,
        activeSession: initialSession,
        isPersisting: true,
        error: null,
      }));
    }

    try {
      await Promise.all([saveMonitoringSession(initialSession), savePostureEvents([startedEvent])]);
    } catch (error) {
      if (!mountedRef.current) {
        return;
      }

      setState((currentState) => ({
        ...currentState,
        error: error instanceof Error ? error.message : 'Unable to start the monitoring session.',
      }));
    } finally {
      isStartingRef.current = false;
      if (mountedRef.current) {
        setState((currentState) => ({
          ...currentState,
          isPersisting: false,
        }));
      }
    }
  }

  async function flushPendingEvents(sessionId: string) {
    if (isPersistingEventsRef.current || pendingEventsRef.current.length === 0) {
      return;
    }

    isPersistingEventsRef.current = true;
    const queuedEvents = attachSessionMetadataToEvents(pendingEventsRef.current, sessionId);
    const queuedEventIds = new Set(queuedEvents.map((event) => event.id));

    try {
      await savePostureEvents(queuedEvents);
      queuedEvents.forEach((event) => {
        persistedEventIdsRef.current.add(event.id);
      });
      pendingEventsRef.current = pendingEventsRef.current.filter((event) => !queuedEventIds.has(event.id));
    } catch (error) {
      if (!mountedRef.current) {
        return;
      }

      setState((currentState) => ({
        ...currentState,
        error: error instanceof Error ? error.message : 'Unable to persist posture transition events.',
      }));
    } finally {
      isPersistingEventsRef.current = false;
    }
  }

  async function persistSessionSnapshot(session: MonitoringSession) {
    if (mountedRef.current) {
      setState((currentState) => ({
        ...currentState,
        isPersisting: true,
      }));
    }

    try {
      await saveMonitoringSession(session);
    } catch (error) {
      if (!mountedRef.current) {
        return;
      }

      setState((currentState) => ({
        ...currentState,
        error: error instanceof Error ? error.message : 'Unable to persist the active monitoring session.',
      }));
    } finally {
      if (mountedRef.current) {
        setState((currentState) => ({
          ...currentState,
          isPersisting: false,
        }));
      }
    }
  }

  async function finalizeActiveSession(endedAt: number) {
    const accumulator = accumulatorRef.current;
    if (!accumulator || isFinalizingRef.current) {
      return;
    }

    isFinalizingRef.current = true;
    accumulatorRef.current = null;

    const finalizedAccumulator = finalizeSessionAccumulator(accumulator, endedAt);
    const finalizedSession = materializeMonitoringSession(finalizedAccumulator, endedAt, endedAt);
    const endedEvent = createSessionLifecycleEvent({
      sessionId: finalizedSession.id,
      timestamp: endedAt,
      type: 'SESSION_ENDED',
      metadata: {
        finalState: finalizedAccumulator.lastObservedState,
        totalDurationSec: finalizedSession.totalDurationSec,
      },
    });

    if (mountedRef.current) {
      setState((currentState) => ({
        ...currentState,
        isPersisting: true,
      }));
    }

    try {
      const dailyContributions = materializeDailyMetricsContributions(finalizedAccumulator);
      const existingDailyMetrics = await Promise.all(
        dailyContributions.map((contribution) => getDailyMetricsByDateKey(contribution.dateKey)),
      );
      const mergedDailyMetrics = dailyContributions.map((contribution, index) =>
        mergeDailyMetrics(existingDailyMetrics[index] ?? null, contribution),
      );
      const pendingTransitionEvents = attachSessionMetadataToEvents(
        pendingEventsRef.current,
        finalizedSession.id,
      );

      await Promise.all([
        saveMonitoringSession(finalizedSession),
        savePostureEvents([...pendingTransitionEvents, endedEvent]),
        ...mergedDailyMetrics.map((metrics) => saveDailyMetrics(metrics)),
      ]);

      pendingEventsRef.current = [];
      const todayDateKey = toDateKey(Date.now());
      const mergedTodayMetrics = mergedDailyMetrics.find((metrics) => metrics.dateKey === todayDateKey) ?? null;

      if (!mountedRef.current) {
        return;
      }

      setState((currentState) => ({
        ...currentState,
        activeSession: null,
        latestCompletedSession: finalizedSession,
        todayMetrics: mergedTodayMetrics ?? currentState.todayMetrics,
        error: null,
      }));
    } catch (error) {
      if (!mountedRef.current) {
        return;
      }

      setState((currentState) => ({
        ...currentState,
        error: error instanceof Error ? error.message : 'Unable to finalize the monitoring session.',
      }));
    } finally {
      persistedEventIdsRef.current.clear();
      isPersistingEventsRef.current = false;
      isFinalizingRef.current = false;
      if (mountedRef.current) {
        setState((currentState) => ({
          ...currentState,
          isPersisting: false,
        }));
      }
    }
  }
}

