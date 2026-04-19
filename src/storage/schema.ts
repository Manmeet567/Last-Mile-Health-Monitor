import type {
  AppSettings,
  CalibrationProfile,
  DailyMetrics,
  MonitoringSession,
  PostureEvent,
  SavedCustomSymptom,
  SymptomCheckIn,
} from '@/types/domain';

export const DB_NAME = 'lastMileHealthMonitorDB';

export type SettingsRecord = {
  id: 'app-settings';
  value: AppSettings;
};

export type LastMileTables = {
  settings: SettingsRecord;
  calibrationProfiles: CalibrationProfile;
  sessions: MonitoringSession;
  events: PostureEvent;
  dailyMetrics: DailyMetrics;
  symptomCheckIns: SymptomCheckIn;
  savedCustomSymptoms: SavedCustomSymptom;
};
