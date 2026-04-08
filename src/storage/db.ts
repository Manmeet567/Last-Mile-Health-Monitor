import Dexie, { type Table } from 'dexie';
import type {
  CalibrationProfile,
  DailyMetrics,
  MonitoringSession,
  PostureEvent,
} from '@/types/domain';
import { DB_NAME, type SessionSample, type SettingsRecord } from '@/storage/schema';

export class LastMileDatabase extends Dexie {
  settings!: Table<SettingsRecord, SettingsRecord['id']>;
  calibrationProfiles!: Table<CalibrationProfile, CalibrationProfile['id']>;
  sessions!: Table<MonitoringSession, MonitoringSession['id']>;
  events!: Table<PostureEvent, PostureEvent['id']>;
  dailyMetrics!: Table<DailyMetrics, DailyMetrics['dateKey']>;
  sessionSamples!: Table<SessionSample, SessionSample['id']>;

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
  }
}

export const db = new LastMileDatabase();
