import {
  getLatestCompletedSession,
  sortCompletedSessionsByEndedAtDesc,
} from '@/core/metrics/session-history';
import { db } from '@/storage/db';
import {
  defaultSettings,
  normalizeAppSettings,
  saveAppSettings,
} from '@/storage/repositories/settings.repository';
import { normalizeCalibrationProfile } from '@/storage/repositories/calibration.repository';

export type LocalDataSnapshot = {
  settingsCount: number;
  calibrationProfilesCount: number;
  sessionsCount: number;
  completedSessionsCount: number;
  eventsCount: number;
  dailyMetricsCount: number;
  symptomCheckInsCount: number;
  savedCustomSymptomsCount: number;
  latestCompletedSessionAt: number | null;
  latestEventAt: number | null;
  latestSymptomCheckInAt: number | null;
};

export async function getLocalDataSnapshot(): Promise<LocalDataSnapshot> {
  const [
    settingsCount,
    calibrationProfilesCount,
    sessions,
    eventsCount,
    dailyMetricsCount,
    latestEvent,
    symptomCheckInsCount,
    savedCustomSymptomsCount,
    latestSymptomCheckIn,
  ] = await Promise.all([
    db.settings.count(),
    db.calibrationProfiles.count(),
    db.sessions.orderBy('startedAt').reverse().toArray(),
    db.events.count(),
    db.dailyMetrics.count(),
    db.events.orderBy('timestamp').reverse().first(),
    db.symptomCheckIns.count(),
    db.savedCustomSymptoms.count(),
    db.symptomCheckIns.orderBy('createdAt').reverse().first(),
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
    symptomCheckInsCount,
    savedCustomSymptomsCount,
    latestCompletedSessionAt: latestCompletedSession?.endedAt ?? null,
    latestEventAt: latestEvent?.timestamp ?? null,
    latestSymptomCheckInAt: latestSymptomCheckIn?.createdAt ?? null,
  };
}

export async function exportLocalData() {
  const [
    settingsRecord,
    calibrationProfiles,
    sessions,
    dailyMetrics,
    events,
    symptomCheckIns,
    savedCustomSymptoms,
  ] = await Promise.all([
    db.settings.get('app-settings'),
    db.calibrationProfiles.orderBy('updatedAt').reverse().toArray(),
    db.sessions.orderBy('startedAt').reverse().toArray(),
    db.dailyMetrics.orderBy('dateKey').reverse().toArray(),
    db.events.orderBy('timestamp').reverse().toArray(),
    db.symptomCheckIns.orderBy('createdAt').reverse().toArray(),
    db.savedCustomSymptoms.orderBy('label').toArray(),
  ]);

  return {
    settings: settingsRecord?.value
      ? normalizeAppSettings(settingsRecord.value)
      : null,
    calibrationProfiles: calibrationProfiles
      .map((profile) => normalizeCalibrationProfile(profile))
      .filter(
        (profile): profile is NonNullable<typeof profile> => profile !== null,
      ),
    sessions,
    dailyMetrics,
    events,
    symptomCheckIns,
    savedCustomSymptoms,
  };
}

export async function clearHistoryData() {
  await db.transaction(
    'rw',
    [db.sessions, db.events, db.dailyMetrics, db.symptomCheckIns],
    async () => {
      await Promise.all([
        db.sessions.clear(),
        db.events.clear(),
        db.dailyMetrics.clear(),
        db.symptomCheckIns.clear(),
      ]);
    },
  );
}

export async function resetCalibrationData() {
  await db.calibrationProfiles.clear();
}

export async function resetSettingsToDefaults() {
  return saveAppSettings(defaultSettings);
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
      db.symptomCheckIns,
      db.savedCustomSymptoms,
    ],
    async () => {
      await Promise.all([
        db.settings.clear(),
        db.calibrationProfiles.clear(),
        db.sessions.clear(),
        db.events.clear(),
        db.dailyMetrics.clear(),
        db.symptomCheckIns.clear(),
        db.savedCustomSymptoms.clear(),
      ]);
    },
  );
}
