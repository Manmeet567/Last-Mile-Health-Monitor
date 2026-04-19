import Dexie, { type Table } from 'dexie';
import type {
  CalibrationProfile,
  DailyMetrics,
  MonitoringSession,
  PostureEvent,
  SavedCustomSymptom,
  SymptomCheckIn,
} from '@/types/domain';
import { DB_NAME, type SettingsRecord } from '@/storage/schema';

export class LastMileDatabase extends Dexie {
  settings!: Table<SettingsRecord, SettingsRecord['id']>;
  calibrationProfiles!: Table<CalibrationProfile, CalibrationProfile['id']>;
  sessions!: Table<MonitoringSession, MonitoringSession['id']>;
  events!: Table<PostureEvent, PostureEvent['id']>;
  dailyMetrics!: Table<DailyMetrics, DailyMetrics['dateKey']>;
  symptomCheckIns!: Table<SymptomCheckIn, SymptomCheckIn['id']>;
  savedCustomSymptoms!: Table<SavedCustomSymptom, SavedCustomSymptom['id']>;

  constructor() {
    super(DB_NAME);

    this.version(1).stores({
      settings: 'id',
      calibrationProfiles: 'id, createdAt, updatedAt',
      sessions: 'id, startedAt, endedAt',
      events: 'id, timestamp, type',
      dailyMetrics: 'dateKey',
      sessionSamples: 'id, sessionId, timestamp',
    });

    this.version(2).stores({
      settings: 'id',
      calibrationProfiles: 'id, createdAt, updatedAt',
      sessions: 'id, startedAt, endedAt',
      events: 'id, timestamp, type',
      dailyMetrics: 'dateKey',
      sessionSamples: null,
    });

    this.version(3).stores({
      settings: 'id',
      calibrationProfiles: 'id, createdAt, updatedAt',
      sessions: 'id, startedAt, endedAt',
      events: 'id, timestamp, type',
      dailyMetrics: 'dateKey',
      sessionSamples: null,
      symptomCheckIns: 'id, createdAt, dateKey',
      savedCustomSymptoms: 'id, label, createdAt',
    });
  }
}

export const db = new LastMileDatabase();
