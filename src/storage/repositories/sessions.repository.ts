import { getLatestCompletedSession, sortCompletedSessionsByEndedAtDesc } from '@/core/metrics/session-history';
import type { MonitoringSession } from '@/types/domain';
import { db } from '@/storage/db';

export async function getLatestMonitoringSession() {
  return db.sessions.orderBy('startedAt').reverse().first();
}

export async function getLatestCompletedMonitoringSession() {
  const sessions = await db.sessions.orderBy('startedAt').reverse().toArray();
  return getLatestCompletedSession(sessions);
}

export async function listRecentMonitoringSessions(limit = 10) {
  return db.sessions.orderBy('startedAt').reverse().limit(limit).toArray();
}

export async function listRecentCompletedMonitoringSessions(limit = 10) {
  const sessions = await db.sessions.orderBy('startedAt').reverse().toArray();
  return sortCompletedSessionsByEndedAtDesc(sessions).slice(0, limit);
}

export async function saveMonitoringSession(session: MonitoringSession) {
  await db.sessions.put(session);
  return session;
}

export async function clearMonitoringSessions() {
  await db.sessions.clear();
}
