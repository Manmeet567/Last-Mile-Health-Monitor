import type { LivePostureState, ReminderSettings } from '@/types/domain';

export type ReminderType = 'POSTURE_NUDGE' | 'BREAK_NUDGE' | 'RECOVERY_NUDGE';

export type ReminderHistoryEntry = {
  type: ReminderType;
  timestamp: number;
};

export type ReminderContext = {
  currentState: LivePostureState;
  sittingBoutDurationSec: number;
  slouchDurationSec: number;
  timeSinceLastBreakSec: number | null;
  timeSinceLastReminderSec: number | null;
  recentReminderHistory: ReminderHistoryEntry[];
  now: number;
  settings: ReminderSettings;
};

export type ReminderDecision = {
  type: ReminderType;
  title: string;
  message: string;
  cooldownExpiresAt: number;
  priority: number;
  context: {
    currentState: LivePostureState;
    sittingBoutDurationSec: number;
    slouchDurationSec: number;
    timeSinceLastBreakSec: number | null;
  };
};

export type ActiveReminder = ReminderDecision & {
  id: string;
  triggeredAt: number;
};
