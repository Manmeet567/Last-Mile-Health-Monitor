import type {
  AppSettings,
  CalibrationProfile,
  DailyMetrics,
  MonitoringSession,
  PostureEvent,
} from '@/types/domain';
import { DB_NAME } from '@/storage/schema';

export type LocalDataExportInput = {
  exportedAt: number;
  settings: AppSettings | null;
  calibrationProfiles: CalibrationProfile[];
  sessions: MonitoringSession[];
  dailyMetrics: DailyMetrics[];
  events: PostureEvent[];
  sessionSamples: Array<Record<string, unknown>>;
};

export function createPrivacyExportDocument(input: LocalDataExportInput) {
  return {
    meta: {
      exportedAt: input.exportedAt,
      dbName: DB_NAME,
      schemaVersion: 1,
      privacyMode: 'local-only',
      recordCounts: {
        settings: input.settings ? 1 : 0,
        calibrationProfiles: input.calibrationProfiles.length,
        sessions: input.sessions.length,
        dailyMetrics: input.dailyMetrics.length,
        events: input.events.length,
        sessionSamples: input.sessionSamples.length,
      },
    },
    settings: input.settings,
    calibrationProfiles: input.calibrationProfiles,
    sessions: input.sessions,
    dailyMetrics: input.dailyMetrics,
    events: input.events,
    sessionSamples: input.sessionSamples,
  };
}

export function formatPrivacyExportFileName(timestamp: number) {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `last-mile-local-data-${year}${month}${day}-${hours}${minutes}.json`;
}

export function formatBytes(value: number | null) {
  if (value === null || Number.isNaN(value)) {
    return 'Unavailable';
  }

  if (value < 1024) {
    return `${value} B`;
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}
