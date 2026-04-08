import { evaluateReminder } from '@/core/reminders/reminder-rules';
import type { ReminderContext } from '@/core/reminders/reminder.types';
import { defaultSettings } from '@/storage/repositories/settings.repository';

function createContext(overrides?: Partial<ReminderContext>): ReminderContext {
  return {
    currentState: 'GOOD_POSTURE',
    sittingBoutDurationSec: 0,
    slouchDurationSec: 0,
    timeSinceLastBreakSec: null,
    timeSinceLastReminderSec: null,
    recentReminderHistory: [],
    now: new Date('2026-04-08T10:00:00').getTime(),
    settings: defaultSettings.reminderSettings,
    ...overrides,
  };
}

describe('reminder rules', () => {
  it('triggers a posture nudge for sustained mild slouch outside cooldown', () => {
    const decision = evaluateReminder(
      createContext({
        currentState: 'MILD_SLOUCH',
        slouchDurationSec: 240,
      }),
    );

    expect(decision?.type).toBe('POSTURE_NUDGE');
    expect(decision?.message).toMatch(/posture/i);
  });

  it('prefers a break nudge for long sitting when posture is otherwise eligible', () => {
    const decision = evaluateReminder(
      createContext({
        currentState: 'GOOD_POSTURE',
        sittingBoutDurationSec: 60 * 50,
        timeSinceLastBreakSec: 60 * 50,
      }),
    );

    expect(decision?.type).toBe('BREAK_NUDGE');
  });

  it('suppresses reminders while cooldown is active', () => {
    const decision = evaluateReminder(
      createContext({
        currentState: 'DEEP_SLOUCH',
        slouchDurationSec: 300,
        timeSinceLastReminderSec: 60,
      }),
    );

    expect(decision).toBeNull();
  });

  it('escalates to a recovery nudge after repeated posture nudges in a short window', () => {
    const now = new Date('2026-04-08T10:00:00').getTime();
    const decision = evaluateReminder(
      createContext({
        currentState: 'MILD_SLOUCH',
        slouchDurationSec: 180,
        now,
        recentReminderHistory: [
          { type: 'POSTURE_NUDGE', timestamp: now - 5 * 60 * 1000 },
          { type: 'POSTURE_NUDGE', timestamp: now - 12 * 60 * 1000 },
        ],
      }),
    );

    expect(decision?.type).toBe('RECOVERY_NUDGE');
  });
});
