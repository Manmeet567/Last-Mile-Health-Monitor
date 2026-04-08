import type { AppSettings } from '@/types/domain';
import { db } from '@/storage/db';

export const defaultSettings: AppSettings = {
  targetInferenceFps: 12,
  preferredModelVariant: 'lightning',
  theme: 'system',
  privacyMode: 'strict',
  reminderSettings: {
    enabled: true,
    minimumSittingBeforeReminderMin: 45,
    slouchThresholdBeforeReminderSec: 180,
    reminderCooldownMin: 20,
  },
};

export async function getAppSettings() {
  const record = await db.settings.get('app-settings');
  return record?.value ?? defaultSettings;
}

export async function saveAppSettings(value: AppSettings) {
  await db.settings.put({ id: 'app-settings', value });
  return value;
}
