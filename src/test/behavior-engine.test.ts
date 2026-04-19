import {
  advanceBehaviorEngine,
  createBehaviorEngineState,
} from '@/features/posture/behavior-engine';
import { defaultSettings } from '@/storage/repositories/settings.repository';

const baseSettings = {
  ...defaultSettings.reminderSettings,
  minimumSittingBeforeReminderMin: 30,
};

describe('behavior-engine', () => {
  it('triggers a mild-slouch nudge after the balanced threshold', () => {
    let state = createBehaviorEngineState();

    state = advanceBehaviorEngine(state, {
      timestamp: 0,
      displayState: 'MILD_SLOUCH',
      frameQualityState: 'GOOD',
      settings: baseSettings,
    }).state;

    const beforeThreshold = advanceBehaviorEngine(state, {
      timestamp: 24_000,
      displayState: 'MILD_SLOUCH',
      frameQualityState: 'GOOD',
      settings: baseSettings,
    });

    expect(beforeThreshold.triggeredReminder).toBeNull();

    const afterThreshold = advanceBehaviorEngine(beforeThreshold.state, {
      timestamp: 25_000,
      displayState: 'MILD_SLOUCH',
      frameQualityState: 'GOOD',
      settings: baseSettings,
    });

    expect(afterThreshold.triggeredReminder?.type).toBe('POSTURE_NUDGE');
    expect(afterThreshold.triggeredReminder?.severity).toBe('soft');
  });

  it('triggers a deep-slouch nudge after the stronger threshold', () => {
    let state = createBehaviorEngineState();

    state = advanceBehaviorEngine(state, {
      timestamp: 0,
      displayState: 'DEEP_SLOUCH',
      frameQualityState: 'GOOD',
      settings: baseSettings,
    }).state;

    const result = advanceBehaviorEngine(state, {
      timestamp: 12_000,
      displayState: 'DEEP_SLOUCH',
      frameQualityState: 'GOOD',
      settings: baseSettings,
    });

    expect(result.triggeredReminder?.type).toBe('POSTURE_NUDGE');
    expect(result.triggeredReminder?.severity).toBe('strong');
  });

  it('does not trigger a nudge before thresholds are reached', () => {
    let state = createBehaviorEngineState();

    state = advanceBehaviorEngine(state, {
      timestamp: 0,
      displayState: 'DEEP_SLOUCH',
      frameQualityState: 'GOOD',
      settings: baseSettings,
    }).state;

    const result = advanceBehaviorEngine(state, {
      timestamp: 8_000,
      displayState: 'DEEP_SLOUCH',
      frameQualityState: 'GOOD',
      settings: baseSettings,
    });

    expect(result.triggeredReminder).toBeNull();
  });

  it('respects cooldowns and avoids repeated reminder spam', () => {
    let state = createBehaviorEngineState();

    state = advanceBehaviorEngine(state, {
      timestamp: 0,
      displayState: 'MILD_SLOUCH',
      frameQualityState: 'GOOD',
      settings: baseSettings,
    }).state;

    const firstTrigger = advanceBehaviorEngine(state, {
      timestamp: 25_000,
      displayState: 'MILD_SLOUCH',
      frameQualityState: 'GOOD',
      settings: baseSettings,
    });

    expect(firstTrigger.triggeredReminder?.severity).toBe('soft');

    const withinCooldown = advanceBehaviorEngine(
      {
        ...firstTrigger.state,
        activeReminder: null,
      },
      {
        timestamp: 70_000,
        displayState: 'MILD_SLOUCH',
        frameQualityState: 'GOOD',
        settings: baseSettings,
      },
    );

    expect(withinCooldown.triggeredReminder).toBeNull();

    const afterCooldown = advanceBehaviorEngine(withinCooldown.state, {
      timestamp: 116_000,
      displayState: 'MILD_SLOUCH',
      frameQualityState: 'GOOD',
      settings: baseSettings,
    });

    expect(afterCooldown.triggeredReminder?.severity).toBe('soft');
  });

  it('detects a meaningful break after sustained away time', () => {
    let state = createBehaviorEngineState();

    state = advanceBehaviorEngine(state, {
      timestamp: 0,
      displayState: 'GOOD_POSTURE',
      frameQualityState: 'GOOD',
      settings: baseSettings,
    }).state;

    state = advanceBehaviorEngine(state, {
      timestamp: 10_000,
      displayState: 'AWAY',
      frameQualityState: 'GOOD',
      settings: baseSettings,
    }).state;

    const breakResult = advanceBehaviorEngine(state, {
      timestamp: 70_000,
      displayState: 'AWAY',
      frameQualityState: 'GOOD',
      settings: baseSettings,
    });

    expect(breakResult.breakDetected).toBe(true);
    expect(breakResult.metrics.breakCount).toBe(1);
  });

  it('accumulates session metrics from stabilized posture states', () => {
    let state = createBehaviorEngineState();

    state = advanceBehaviorEngine(state, {
      timestamp: 0,
      displayState: 'GOOD_POSTURE',
      frameQualityState: 'GOOD',
      settings: baseSettings,
    }).state;

    state = advanceBehaviorEngine(state, {
      timestamp: 20_000,
      displayState: 'GOOD_POSTURE',
      frameQualityState: 'GOOD',
      settings: baseSettings,
    }).state;

    state = advanceBehaviorEngine(state, {
      timestamp: 40_000,
      displayState: 'MILD_SLOUCH',
      frameQualityState: 'GOOD',
      settings: baseSettings,
    }).state;

    const result = advanceBehaviorEngine(state, {
      timestamp: 60_000,
      displayState: 'MILD_SLOUCH',
      frameQualityState: 'GOOD',
      settings: baseSettings,
    });

    expect(result.metrics.totalSessionDurationSec).toBe(60);
    expect(result.metrics.totalGoodPostureSec).toBe(40);
    expect(result.metrics.totalSlouchSec).toBe(20);
  });

  it('suppresses posture nudges when frame quality is poor', () => {
    let state = createBehaviorEngineState();

    state = advanceBehaviorEngine(state, {
      timestamp: 0,
      displayState: 'DEEP_SLOUCH',
      frameQualityState: 'POOR',
      settings: baseSettings,
    }).state;

    const result = advanceBehaviorEngine(state, {
      timestamp: 20_000,
      displayState: 'DEEP_SLOUCH',
      frameQualityState: 'POOR',
      settings: baseSettings,
    });

    expect(result.triggeredReminder).toBeNull();
  });
});
