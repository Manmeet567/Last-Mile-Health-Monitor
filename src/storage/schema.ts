import type {
  AppSettings,
  CalibrationProfile,
  DailyMetrics,
  LivePostureState,
  MonitoringSession,
  PostureEvent,
} from '@/types/domain';

export const DB_NAME = 'lastMileHealthMonitorDB';

export type SettingsRecord = {
  id: 'app-settings';
  value: AppSettings;
};

export type SessionSample = {
  id: string;
  sessionId: string;
  timestamp: number;
  postureState: LivePostureState;
};

export type LastMileTables = {
  settings: SettingsRecord;
  calibrationProfiles: CalibrationProfile;
  sessions: MonitoringSession;
  events: PostureEvent;
  dailyMetrics: DailyMetrics;
  sessionSamples: SessionSample;
};
