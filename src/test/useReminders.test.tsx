import { renderHook, waitFor } from '@testing-library/react';
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
    repositoryMocks.getDailyMetricsByDateKey.mockImplementation(() => Promise.resolve<DailyMetrics | null>(null));
    repositoryMocks.saveDailyMetrics.mockImplementation((metrics: DailyMetrics) => Promise.resolve(metrics));
    repositoryMocks.savePostureEvents.mockImplementation((events: PostureEvent[]) => Promise.resolve(events));
  });

  it('clears an active reminder when posture quality drops back to detecting', async () => {
    const { result, rerender } = renderHook<HookResult, HookProps>((props) => useReminders(props), {
      initialProps: {
        enabled: true,
        settings: defaultSettings.reminderSettings,
        postureState: 'MILD_SLOUCH',
        latestTimestamp: 1_000,
        sessionId: 'session-1',
      },
    });

    rerender({
      enabled: true,
      settings: defaultSettings.reminderSettings,
      postureState: 'MILD_SLOUCH',
      latestTimestamp: 200_000,
      sessionId: 'session-1',
    });

    await waitFor(() => {
      expect(result.current.activeReminder?.type).toBe('POSTURE_NUDGE');
    });

    rerender({
      enabled: true,
      settings: defaultSettings.reminderSettings,
      postureState: 'DETECTING',
      latestTimestamp: 201_000,
      sessionId: 'session-1',
    });

    await waitFor(() => {
      expect(result.current.activeReminder).toBeNull();
    });
  });

  it('tracks time since last break from the end of the break instead of the start', async () => {
    const { result, rerender } = renderHook<HookResult, HookProps>((props) => useReminders(props), {
      initialProps: {
        enabled: true,
        settings: defaultSettings.reminderSettings,
        postureState: 'GOOD_POSTURE',
        latestTimestamp: 0,
        sessionId: 'session-2',
      },
    });

    rerender({
      enabled: true,
      settings: defaultSettings.reminderSettings,
      postureState: 'AWAY',
      latestTimestamp: 1_000,
      sessionId: 'session-2',
    });

    rerender({
      enabled: true,
      settings: defaultSettings.reminderSettings,
      postureState: 'GOOD_POSTURE',
      latestTimestamp: 6_000,
      sessionId: 'session-2',
    });

    rerender({
      enabled: true,
      settings: defaultSettings.reminderSettings,
      postureState: 'GOOD_POSTURE',
      latestTimestamp: 7_000,
      sessionId: 'session-2',
    });

    await waitFor(() => {
      expect(result.current.contextSnapshot.timeSinceLastBreakSec).toBe(1);
    });

    rerender({
      enabled: true,
      settings: defaultSettings.reminderSettings,
      postureState: 'GOOD_POSTURE',
      latestTimestamp: 66_000,
      sessionId: 'session-2',
    });

    await waitFor(() => {
      expect(result.current.contextSnapshot.timeSinceLastBreakSec).toBe(60);
    });
  });

  it('retries pending reminder persistence when monitoring stops', async () => {
    repositoryMocks.savePostureEvents
      .mockImplementationOnce(() => Promise.reject(new Error('temporary reminder write failure')))
      .mockImplementationOnce((events: PostureEvent[]) => Promise.resolve(events));

    const { rerender } = renderHook<HookResult, HookProps>((props) => useReminders(props), {
      initialProps: {
        enabled: true,
        settings: defaultSettings.reminderSettings,
        postureState: 'MILD_SLOUCH',
        latestTimestamp: 1_000,
        sessionId: 'session-3',
      },
    });

    rerender({
      enabled: true,
      settings: defaultSettings.reminderSettings,
      postureState: 'MILD_SLOUCH',
      latestTimestamp: 200_000,
      sessionId: 'session-3',
    });

    await waitFor(() => {
      expect(repositoryMocks.savePostureEvents).toHaveBeenCalledTimes(1);
    });

    rerender({
      enabled: false,
      settings: defaultSettings.reminderSettings,
      postureState: 'MILD_SLOUCH',
      latestTimestamp: 200_000,
      sessionId: 'session-3',
    });

    await waitFor(() => {
      expect(repositoryMocks.savePostureEvents).toHaveBeenCalledTimes(2);
      expect(repositoryMocks.savePostureEvents).toHaveBeenLastCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ type: 'REMINDER_TRIGGERED' }),
        ]),
      );
    });
  });
});
