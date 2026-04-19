import {
  getLatestCompletedSession,
  sortCompletedSessionsByEndedAtDesc,
} from '@/core/metrics/session-history';
import type { MonitoringSession } from '@/types/domain';
import { db } from '@/storage/db';

export async function getLatestMonitoringSession() {
  const session = await db.sessions.orderBy('startedAt').reverse().first();
  return session ? normalizeMonitoringSession(session) : null;
}

export async function getLatestCompletedMonitoringSession() {
  const sessions = (await db.sessions.orderBy('startedAt').reverse().toArray()).map(
    normalizeMonitoringSession,
  );
  return getLatestCompletedSession(sessions);
}

export async function listRecentMonitoringSessions(limit = 10) {
  const sessions = await db.sessions.orderBy('startedAt').reverse().limit(limit).toArray();
  return sessions.map(normalizeMonitoringSession);
}

export async function listRecentCompletedMonitoringSessions(limit = 10) {
  const sessions = (await db.sessions.orderBy('startedAt').reverse().toArray()).map(
    normalizeMonitoringSession,
  );
  return sortCompletedSessionsByEndedAtDesc(sessions).slice(0, limit);
}

export async function saveMonitoringSession(session: MonitoringSession) {
  const normalizedSession = normalizeMonitoringSession(session);
  await db.sessions.put(normalizedSession);
  return normalizedSession;
}

export async function clearMonitoringSessions() {
  await db.sessions.clear();
}

export function normalizeMonitoringSession(
  session: MonitoringSession,
): MonitoringSession {
  const durationMs = session.durationMs ?? session.totalDurationSec * 1000;
  const goodPostureMs = session.goodPostureMs ?? session.goodPostureSec * 1000;
  const slouchMs =
    session.slouchMs ??
    (session.mildSlouchSec + session.deepSlouchSec) * 1000;
  const goodPosturePercent =
    session.goodPosturePercent ??
    (session.sittingSec > 0
      ? Math.round((session.goodPostureSec / session.sittingSec) * 100)
      : 0);

  return {
    ...session,
    durationMs,
    goodPostureMs,
    slouchMs,
    nudgeCount: session.nudgeCount ?? 0,
    longestSlouchStreakMs: session.longestSlouchStreakMs ?? 0,
    goodPosturePercent,
    sessionScoreLabel:
      session.sessionScoreLabel ?? deriveLegacySessionScoreLabel(goodPosturePercent),
    insights: session.insights ?? [],
    reflectionLine:
      session.reflectionLine ??
      deriveLegacyReflectionLine(
        session.sessionScoreLabel ?? deriveLegacySessionScoreLabel(goodPosturePercent),
      ),
    recoverySuggestion:
      session.recoverySuggestion ??
      deriveLegacyRecoverySuggestion(
        session.sessionScoreLabel ?? deriveLegacySessionScoreLabel(goodPosturePercent),
      ),
  };
}

function deriveLegacySessionScoreLabel(
  goodPosturePercent: number,
): MonitoringSession['sessionScoreLabel'] {
  if (goodPosturePercent >= 70) {
    return 'Good';
  }

  if (goodPosturePercent >= 45) {
    return 'Okay';
  }

  return 'Needs improvement';
}

function deriveLegacyReflectionLine(
  sessionScoreLabel: MonitoringSession['sessionScoreLabel'],
) {
  switch (sessionScoreLabel) {
    case 'Good':
      return 'You stayed consistent through most of this session.';
    case 'Needs improvement':
      return 'Your posture drifted for a large part of this session.';
    case 'Okay':
    default:
      return 'This session had a mix of steadiness and drift.';
  }
}

function deriveLegacyRecoverySuggestion(
  sessionScoreLabel: MonitoringSession['sessionScoreLabel'],
) {
  switch (sessionScoreLabel) {
    case 'Good':
      return 'A light reset can help the next session start just as smoothly.';
    case 'Needs improvement':
      return 'A small posture check-in can help stabilize earlier.';
    case 'Okay':
    default:
      return 'Try a quick reset earlier next time.';
  }
}
