import type { MonitoringSession } from '@/types/domain';

export function sortCompletedSessionsByEndedAtDesc(sessions: MonitoringSession[]) {
  return [...sessions]
    .filter((session) => session.endedAt !== null)
    .sort((left, right) => {
      const endedAtDelta = (right.endedAt ?? 0) - (left.endedAt ?? 0);

      if (endedAtDelta !== 0) {
        return endedAtDelta;
      }

      return right.startedAt - left.startedAt;
    });
}

export function getLatestCompletedSession(sessions: MonitoringSession[]) {
  return sortCompletedSessionsByEndedAtDesc(sessions)[0] ?? null;
}
