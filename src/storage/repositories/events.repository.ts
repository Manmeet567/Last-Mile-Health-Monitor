import type { PostureEvent } from '@/types/domain';
import { db } from '@/storage/db';

const EVENT_RETENTION_DAYS = 90;
const EVENT_RETENTION_MS = EVENT_RETENTION_DAYS * 24 * 60 * 60 * 1000;

export async function listRecentPostureEvents(limit = 50) {
  return db.events.orderBy('timestamp').reverse().limit(limit).toArray();
}

export async function savePostureEvents(events: PostureEvent[]) {
  if (events.length === 0) {
    return [];
  }

  await db.events.bulkPut(events);
  const newestTimestamp = Math.max(...events.map((event) => event.timestamp));
  const cutoffTimestamp = newestTimestamp - EVENT_RETENTION_MS;
  await db.events.where('timestamp').below(cutoffTimestamp).delete();
  return events;
}

export async function clearPostureEvents() {
  await db.events.clear();
}
