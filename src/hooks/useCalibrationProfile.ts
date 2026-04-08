import { useEffect, useState } from 'react';
import type { CalibrationProfile } from '@/types/domain';
import {
  clearCalibrationProfiles,
  getLatestCalibrationProfile,
  saveCalibrationProfile,
} from '@/storage/repositories/calibration.repository';

export function useCalibrationProfile() {
  const [profile, setProfile] = useState<CalibrationProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void refresh();
  }, []);

  async function refresh() {
    setIsLoading(true);
    const nextProfile = await getLatestCalibrationProfile();
    setProfile(nextProfile ?? null);
    setIsLoading(false);
  }

  async function save(profileToSave: CalibrationProfile) {
    const savedProfile = await saveCalibrationProfile(profileToSave);
    setProfile(savedProfile);
    return savedProfile;
  }

  async function clear() {
    await clearCalibrationProfiles();
    setProfile(null);
  }

  return {
    profile,
    isLoading,
    refresh,
    save,
    clear,
  };
}
