import { useEffect, useState } from 'react';
import type { AppSettings, ReminderSettings } from '@/types/domain';
import { defaultSettings, getAppSettings, saveAppSettings } from '@/storage/repositories/settings.repository';

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void refresh();
  }, []);

  async function refresh() {
    setIsLoading(true);

    try {
      const nextSettings = await getAppSettings();
      setSettings(nextSettings);
      setError(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Unable to load app settings.');
    } finally {
      setIsLoading(false);
    }
  }

  async function save(nextSettings: AppSettings) {
    const savedSettings = await saveAppSettings(nextSettings);
    setSettings(savedSettings);
    setError(null);
    return savedSettings;
  }

  async function saveReminderSettings(nextReminderSettings: ReminderSettings) {
    return save({
      ...settings,
      reminderSettings: nextReminderSettings,
    });
  }

  return {
    settings,
    isLoading,
    error,
    refresh,
    save,
    saveReminderSettings,
  };
}
