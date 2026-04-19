import { act, renderHook } from '@testing-library/react';
import type { DailyMetrics, PostureEvent } from '@/types/domain';

const repositoryMocks = vi.hoisted(() => ({
  getDailyMetricsByDateKey: vi.fn(() => Promise.resolve<DailyMetrics | null>(null)),
  saveDailyMetrics: vi.fn((metrics: DailyMetrics) => Promise.resolve(metrics)),
  savePostureEvents: vi.fn((events: PostureEvent[]) => Promise.resolve(events)),
}));

vi.mock('@/storage/repositories/daily-metrics.repository', () => ({
  getDailyMetricsByDateKey: repositoryMocks.getDailyMetricsByDateKey,
  saveDailyMetrics: repositoryMocks.saveDailyMetrics,
}));

vi.mock('@/storage/repositories/events.repository', () => ({
  savePostureEvents: repositoryMocks.savePostureEvents,
}));

import { useReminders } from '@/hooks/useReminders';
import { defaultSettings } from '@/storage/repositories/settings.repository';

type HookProps = Parameters<typeof useReminders>[0];
type HookResult = ReturnType<typeof useReminders>;

describe('useReminders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    repositoryMocks.getDailyMetricsByDateKey.mockImplementation(() => Promise.resolve<DailyMetrics | null>(null));
    repositoryMocks.saveDailyMetrics.mockImplementation((metrics: DailyMetrics) => Promise.resolve(metrics));
    repositoryMocks.savePostureEvents.mockImplementation((events: PostureEvent[]) => Promise.resolve(events));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('auto-dismisses the active nudge after five seconds', async () => {
    const { result, rerender } = renderHook<HookResult, HookProps>((props) => useReminders(props), {
      initialProps: {
        enabled: true,
        settings: defaultSettings.reminderSettings,
        postureState: 'MILD_SLOUCH',
        frameQualityState: 'GOOD',
        latestTimestamp: 0,
        sessionId: 'session-1',
      },
    });

    await act(async () => {
      rerender({
        enabled: true,
        settings: defaultSettings.reminderSettings,
        postureState: 'MILD_SLOUCH',
        frameQualityState: 'GOOD',
        latestTimestamp: 25_000,
        sessionId: 'session-1',
      });
      await Promise.resolve();
    });

    expect(result.current.activeReminder?.type).toBe('POSTURE_NUDGE');

    await act(async () => {
      vi.advanceTimersByTime(5_000);
      await Promise.resolve();
    });

    expect(result.current.activeReminder).toBeNull();
  });
});
