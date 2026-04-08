import { getLatestCompletedSession, sortCompletedSessionsByEndedAtDesc } from '@/core/metrics/session-history';
import { db } from '@/storage/db';
import { defaultSettings } from '@/storage/repositories/settings.repository';

export type LocalDataSnapshot = {
  settingsCount: number;
  calibrationProfilesCount: number;
  sessionsCount: number;
  completedSessionsCount: number;
  eventsCount: number;
  dailyMetricsCount: number;
  sessionSamplesCount: number;
  latestCompletedSessionAt: number | null;
  latestEventAt: number | null;
};

export async function getLocalDataSnapshot(): Promise<LocalDataSnapshot> {
  const [
    settingsCount,
    calibrationProfilesCount,
    sessions,
    eventsCount,
    dailyMetricsCount,
    sessionSamplesCount,
    latestEvent,
  ] = await Promise.all([
    db.settings.count(),
    db.calibrationProfiles.count(),
    db.sessions.orderBy('startedAt').reverse().toArray(),
    db.events.count(),
    db.dailyMetrics.count(),
    db.sessionSamples.count(),
    db.events.orderBy('timestamp').reverse().first(),
  ]);

  const completedSessions = sortCompletedSessionsByEndedAtDesc(sessions);
  const latestCompletedSession = getLatestCompletedSession(sessions);

  return {
    settingsCount,
    calibrationProfilesCount,
    sessionsCount: sessions.length,
    completedSessionsCount: completedSessions.length,
    eventsCount,
    dailyMetricsCount,
    sessionSamplesCount,
    latestCompletedSessionAt: latestCompletedSession?.endedAt ?? null,
    latestEventAt: latestEvent?.timestamp ?? null,
  };
}

export async function exportLocalData() {
  const [settingsRecord, calibrationProfiles, sessions, dailyMetrics, events, sessionSamples] =
    await Promise.all([
      db.settings.get('app-settings'),
      db.calibrationProfiles.orderBy('updatedAt').reverse().toArray(),
      db.sessions.orderBy('startedAt').reverse().toArray(),
      db.dailyMetrics.orderBy('dateKey').reverse().toArray(),
      db.events.orderBy('timestamp').reverse().toArray(),
      db.sessionSamples.orderBy('timestamp').reverse().toArray(),
    ]);

  return {
    settings: settingsRecord?.value ?? null,
    calibrationProfiles,
    sessions,
    dailyMetrics,
    events,
    sessionSamples,
  };
}

export async function clearHistoryData() {
  await db.transaction('rw', [db.sessions, db.events, db.dailyMetrics, db.sessionSamples], async () => {
    await Promise.all([
      db.sessions.clear(),
      db.events.clear(),
      db.dailyMetrics.clear(),
      db.sessionSamples.clear(),
    ]);
  });
}

export async function resetCalibrationData() {
  await db.calibrationProfiles.clear();
}

export async function resetSettingsToDefaults() {
  await db.settings.put({
    id: 'app-settings',
    value: defaultSettings,
  });

  return defaultSettings;
}

export async function clearAllLocalData() {
  await db.transaction(
    'rw',
    [
      db.settings,
      db.calibrationProfiles,
      db.sessions,
      db.events,
      db.dailyMetrics,
      db.sessionSamples,
    ],
    async () => {
      await Promise.all([
        db.settings.clear(),
        db.calibrationProfiles.clear(),
        db.sessions.clear(),
        db.events.clear(),
        db.dailyMetrics.clear(),
        db.sessionSamples.clear(),
      ]);
    },
  );
}
