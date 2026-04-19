import {
  buildSymptomCheckIn,
  normalizeSymptomLabel,
} from '@/core/symptoms/symptom-check-ins';
import { db } from '@/storage/db';
import { toDateKey } from '@/utils/date';
import type {
  PresetSymptomId,
  SavedCustomSymptom,
  SymptomCheckInSource,
  SymptomDuration,
  SymptomSeverity,
} from '@/types/domain';

type SaveSymptomCheckInInput = {
  createdAt?: number;
  source: SymptomCheckInSource;
  presetSymptoms: PresetSymptomId[];
  customSymptoms: string[];
  severity: SymptomSeverity;
  duration: SymptomDuration;
  interferedWithWork: boolean;
};

export async function listRecentSymptomCheckIns(limit = 10) {
  return db.symptomCheckIns
    .orderBy('createdAt')
    .reverse()
    .limit(limit)
    .toArray();
}

export async function listAllSymptomCheckIns() {
  return db.symptomCheckIns.orderBy('createdAt').reverse().toArray();
}

export async function getLatestSymptomCheckInForDate(dateKey: string) {
  const entries = await db.symptomCheckIns
    .where('dateKey')
    .equals(dateKey)
    .toArray();
  return (
    entries.sort((left, right) => right.createdAt - left.createdAt)[0] ?? null
  );
}

export async function getTodaySymptomCheckIn() {
  return getLatestSymptomCheckInForDate(toDateKey(Date.now()));
}

export async function listSavedCustomSymptoms() {
  return db.savedCustomSymptoms.orderBy('label').toArray();
}

export async function saveCustomSymptomLabel(label: string) {
  const normalizedLabel = normalizeSymptomLabel(label);

  if (!normalizedLabel) {
    throw new Error('Enter a custom symptom label before saving it.');
  }

  const existing = await db.savedCustomSymptoms
    .where('label')
    .equalsIgnoreCase(normalizedLabel)
    .first();

  if (existing) {
    return existing;
  }

  const createdAt = Date.now();
  const nextItem: SavedCustomSymptom = {
    id: `custom-symptom-${createdAt}`,
    label: normalizedLabel,
    createdAt,
  };

  await db.savedCustomSymptoms.put(nextItem);
  return nextItem;
}

export async function saveSymptomCheckIn(input: SaveSymptomCheckInInput) {
  const nextCheckIn = buildSymptomCheckIn(input);

  if (
    nextCheckIn.presetSymptoms.length === 0 &&
    nextCheckIn.customSymptoms.length === 0
  ) {
    throw new Error(
      "Select at least one symptom before saving today's check-in.",
    );
  }

  await db.symptomCheckIns.put(nextCheckIn);
  return nextCheckIn;
}

export async function clearSymptomCheckIns() {
  await db.symptomCheckIns.clear();
}

export async function clearSavedCustomSymptoms() {
  await db.savedCustomSymptoms.clear();
}
