import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import {
  listRecentSymptomCheckIns,
  listSavedCustomSymptoms,
  saveCustomSymptomLabel,
  saveSymptomCheckIn,
} from '@/storage/repositories/symptoms.repository';
import { toDateKey } from '@/utils/date';
import type {
  PresetSymptomId,
  SymptomCheckInSource,
  SymptomDuration,
  SymptomSeverity,
} from '@/types/domain';

type SaveSymptomCheckInInput = {
  source: SymptomCheckInSource;
  presetSymptoms: PresetSymptomId[];
  customSymptoms: string[];
  severity: SymptomSeverity;
  duration: SymptomDuration;
  interferedWithWork: boolean;
};

export function useSymptomCheckIns() {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const todayDateKey = toDateKey(Date.now());

  const snapshot = useLiveQuery(async () => {
    const [recentCheckIns, savedCustomSymptoms] = await Promise.all([
      listRecentSymptomCheckIns(8),
      listSavedCustomSymptoms(),
    ]);

    return {
      recentCheckIns,
      savedCustomSymptoms,
      todayCheckIn:
        recentCheckIns.find((entry) => entry.dateKey === todayDateKey) ?? null,
    };
  }, [todayDateKey]);

  async function addCustomSymptom(label: string) {
    setIsSaving(true);

    try {
      const savedSymptom = await saveCustomSymptomLabel(label);
      setError(null);
      return savedSymptom;
    } catch (nextError) {
      const message =
        nextError instanceof Error
          ? nextError.message
          : 'Unable to save this custom symptom locally.';
      setError(message);
      throw nextError;
    } finally {
      setIsSaving(false);
    }
  }

  async function submitCheckIn(input: SaveSymptomCheckInInput) {
    setIsSaving(true);

    try {
      const savedCheckIn = await saveSymptomCheckIn(input);
      setError(null);
      return savedCheckIn;
    } catch (nextError) {
      const message =
        nextError instanceof Error
          ? nextError.message
          : 'Unable to save this symptom check-in locally.';
      setError(message);
      throw nextError;
    } finally {
      setIsSaving(false);
    }
  }

  return {
    recentCheckIns: snapshot?.recentCheckIns ?? [],
    savedCustomSymptoms: snapshot?.savedCustomSymptoms ?? [],
    todayCheckIn: snapshot?.todayCheckIn ?? null,
    isLoading: !snapshot,
    isSaving,
    error,
    addCustomSymptom,
    submitCheckIn,
  };
}
