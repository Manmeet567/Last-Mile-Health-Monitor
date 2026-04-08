import type { CalibrationProfile } from '@/types/domain';
import { db } from '@/storage/db';

export async function getLatestCalibrationProfile() {
  return db.calibrationProfiles.orderBy('updatedAt').reverse().first();
}

export async function saveCalibrationProfile(profile: CalibrationProfile) {
  await db.calibrationProfiles.put(profile);
  return profile;
}

export async function clearCalibrationProfiles() {
  await db.calibrationProfiles.clear();
}
