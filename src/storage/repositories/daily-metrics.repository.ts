import type { DailyMetrics } from '@/types/domain';
import { db } from '@/storage/db';

export async function getDailyMetricsByDateKey(dateKey: string) {
  return db.dailyMetrics.get(dateKey);
}

export async function listDailyMetrics(limit = 30) {
  return db.dailyMetrics.orderBy('dateKey').reverse().limit(limit).toArray();
}

export async function listAllDailyMetrics() {
  return db.dailyMetrics.orderBy('dateKey').reverse().toArray();
}

export async function saveDailyMetrics(metrics: DailyMetrics) {
  await db.dailyMetrics.put(metrics);
  return metrics;
}

export async function clearDailyMetrics() {
  await db.dailyMetrics.clear();
}
