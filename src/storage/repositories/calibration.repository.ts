import type { CalibrationProfile } from '@/types/domain';
import { db } from '@/storage/db';

export function normalizeCalibrationProfile(
  profile: Partial<CalibrationProfile> | null | undefined,
): CalibrationProfile | null {
  if (
    !profile?.id ||
    typeof profile.createdAt !== 'number' ||
    typeof profile.updatedAt !== 'number' ||
    typeof profile.baselineTrunkAngle !== 'number' ||
    typeof profile.baselineHeadOffset !== 'number' ||
    typeof profile.torsoLength !== 'number' ||
    (profile.preferredSensitivity !== 'low' &&
      profile.preferredSensitivity !== 'medium' &&
      profile.preferredSensitivity !== 'high') ||
    typeof profile.mildSlouchThreshold !== 'number' ||
    typeof profile.deepSlouchThreshold !== 'number' ||
    typeof profile.headOffsetWarningThreshold !== 'number' ||
    typeof profile.sampleCount !== 'number'
  ) {
    return null;
  }

  return {
    id: profile.id,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
    baselineTrunkAngle: profile.baselineTrunkAngle,
    baselineHeadOffset: profile.baselineHeadOffset,
    torsoLength: profile.torsoLength,
    preferredSensitivity: profile.preferredSensitivity,
    mildSlouchThreshold: profile.mildSlouchThreshold,
    deepSlouchThreshold: profile.deepSlouchThreshold,
    headOffsetWarningThreshold: profile.headOffsetWarningThreshold,
    sampleCount: profile.sampleCount,
  };
}

export async function getLatestCalibrationProfile() {
  const profile = await db.calibrationProfiles
    .orderBy('updatedAt')
    .reverse()
    .first();
  return normalizeCalibrationProfile(profile);
}

export async function saveCalibrationProfile(profile: CalibrationProfile) {
  const normalizedProfile = normalizeCalibrationProfile(profile);

  if (!normalizedProfile) {
    throw new Error(
      'Calibration profile is incomplete and could not be saved.',
    );
  }

  await db.calibrationProfiles.put(normalizedProfile);
  return normalizedProfile;
}

export async function clearCalibrationProfiles() {
  await db.calibrationProfiles.clear();
}
