import type { AppSettings, ReminderSettings } from '@/types/domain';
import { db } from '@/storage/db';

export const defaultSettings: AppSettings = {
  reminderSettings: {
    enabled: true,
    minimumSittingBeforeReminderMin: 45,
    slouchThresholdBeforeReminderSec: 180,
    reminderCooldownMin: 20,
  },
};

export function normalizeReminderSettings(
  reminderSettings: Partial<ReminderSettings> | null | undefined,
): ReminderSettings {
  return {
    enabled:
      reminderSettings?.enabled ?? defaultSettings.reminderSettings.enabled,
    minimumSittingBeforeReminderMin:
      reminderSettings?.minimumSittingBeforeReminderMin ??
      defaultSettings.reminderSettings.minimumSittingBeforeReminderMin,
    slouchThresholdBeforeReminderSec:
      reminderSettings?.slouchThresholdBeforeReminderSec ??
      defaultSettings.reminderSettings.slouchThresholdBeforeReminderSec,
    reminderCooldownMin:
      reminderSettings?.reminderCooldownMin ??
      defaultSettings.reminderSettings.reminderCooldownMin,
    workingHoursStart: reminderSettings?.workingHoursStart || undefined,
    workingHoursEnd: reminderSettings?.workingHoursEnd || undefined,
  };
}

export function normalizeAppSettings(
  value: Partial<AppSettings> | null | undefined,
): AppSettings {
  return {
    reminderSettings: normalizeReminderSettings(value?.reminderSettings),
  };
}

export async function getAppSettings() {
  const record = await db.settings.get('app-settings');
  return normalizeAppSettings(record?.value);
}

export async function saveAppSettings(value: AppSettings) {
  const normalizedSettings = normalizeAppSettings(value);
  await db.settings.put({ id: 'app-settings', value: normalizedSettings });
  return normalizedSettings;
}
