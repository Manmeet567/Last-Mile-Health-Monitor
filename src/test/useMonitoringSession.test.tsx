import { act, renderHook, waitFor } from '@testing-library/react';
import type { DailyMetrics, MonitoringSession, PostureEvent } from '@/types/domain';

const repositoryMocks = vi.hoisted(() => ({
  getLatestCompletedMonitoringSession: vi.fn(() => Promise.resolve<MonitoringSession | null>(null)),
  getDailyMetricsByDateKey: vi.fn(() => Promise.resolve<DailyMetrics | null>(null)),
  saveMonitoringSession: vi.fn((session: MonitoringSession) => Promise.resolve(session)),
  savePostureEvents: vi.fn((events: PostureEvent[]) => Promise.resolve(events)),
  saveDailyMetrics: vi.fn((metrics: DailyMetrics) => Promise.resolve(metrics)),
}));

vi.mock('@/storage/repositories/sessions.repository', () => ({
  getLatestCompletedMonitoringSession: repositoryMocks.getLatestCompletedMonitoringSession,
  saveMonitoringSession: repositoryMocks.saveMonitoringSession,
}));

vi.mock('@/storage/repositories/daily-metrics.repository', () => ({
  getDailyMetricsByDateKey: repositoryMocks.getDailyMetricsByDateKey,
  saveDailyMetrics: repositoryMocks.saveDailyMetrics,
}));

vi.mock('@/storage/repositories/events.repository', () => ({
  savePostureEvents: repositoryMocks.savePostureEvents,
}));

import { useMonitoringSession } from '@/hooks/useMonitoringSession';

type HookProps = Parameters<typeof useMonitoringSession>[0];
type HookResult = ReturnType<typeof useMonitoringSession>;

function createSessionSummary(overrides?: Partial<NonNullable<HookProps['sessionSummary']>>) {
  return {
    durationMs: 60_000,
    goodPostureMs: 42_000,
    slouchMs: 18_000,
    breakCount: 1,
    nudgeCount: 2,
    longestSlouchStreakMs: 24_000,
    goodPosturePercent: 70,
    sessionScoreLabel: 'Good' as const,
    insights: ['Great job maintaining good posture this session.'],
    reflectionLine: 'You stayed consistent through most of this session.',
    recoverySuggestion: 'A light reset can help the next session start just as smoothly.',
    ...overrides,
  };
}

function createSnapshot(state: HookProps['postureSnapshot']['state']): HookProps['postureSnapshot'] {
  return {
    state,
    candidateState: state,
    stateSince: 0,
    candidateSince: 0,
    reason: '',
    emittedEvents: [],
  };
}

describe('useMonitoringSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Date, 'now').mockReturnValue(61_000);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('finalizes and persists a completed session when the camera turns off', async () => {
    const { result, rerender } = renderHook<HookResult, HookProps>((props) => useMonitoringSession(props), {
      initialProps: {
        enabled: true,
        postureSnapshot: createSnapshot('GOOD_POSTURE'),
        latestTimestamp: 1_000,
        sessionEligible: true,
        sessionEndAt: null,
        sessionSummary: createSessionSummary(),
      },
    });

    await act(async () => {
      rerender({
        enabled: true,
        postureSnapshot: createSnapshot('GOOD_POSTURE'),
        latestTimestamp: 61_000,
        sessionEligible: true,
        sessionEndAt: null,
        sessionSummary: createSessionSummary({ durationMs: 60_000 }),
      });
      await Promise.resolve();
    });

    await act(async () => {
      rerender({
        enabled: false,
        postureSnapshot: createSnapshot('GOOD_POSTURE'),
        latestTimestamp: 61_000,
        sessionEligible: true,
        sessionEndAt: null,
        sessionSummary: createSessionSummary({ durationMs: 60_000 }),
      });
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(result.current.latestCompletedSession).toEqual(
        expect.objectContaining({
          endedAt: 61_000,
          sessionScoreLabel: 'Good',
          nudgeCount: 2,
        }),
      );
    });

    await waitFor(() => {
      expect(repositoryMocks.saveMonitoringSession).toHaveBeenLastCalledWith(
        expect.objectContaining({
          endedAt: 61_000,
          sessionScoreLabel: 'Good',
          nudgeCount: 2,
          reflectionLine:
            'You stayed consistent through most of this session.',
          recoverySuggestion:
            'A light reset can help the next session start just as smoothly.',
          insights: ['Great job maintaining good posture this session.'],
        }),
      );
    });
  });

  it('finalizes and persists a completed session after a long away session-end signal', async () => {
    const { result, rerender } = renderHook<HookResult, HookProps>((props) => useMonitoringSession(props), {
      initialProps: {
        enabled: true,
        postureSnapshot: createSnapshot('GOOD_POSTURE'),
        latestTimestamp: 1_000,
        sessionEligible: true,
        sessionEndAt: null,
        sessionSummary: createSessionSummary(),
      },
    });

    await waitFor(() => {
      expect(result.current.activeSession).toEqual(
        expect.objectContaining({
          id: 'session-1000',
        }),
      );
    });

    await act(async () => {
      rerender({
        enabled: true,
        postureSnapshot: createSnapshot('AWAY'),
        latestTimestamp: 151_000,
        sessionEligible: false,
        sessionEndAt: 151_000,
        sessionSummary: createSessionSummary({
          durationMs: 150_000,
          sessionScoreLabel: 'Okay',
          insights: ["You didn't take a break this session."],
          reflectionLine: 'This session had a mix of steadiness and drift.',
          recoverySuggestion: 'Try a quick reset earlier next time.',
        }),
      });
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(result.current.latestCompletedSession).toEqual(
        expect.objectContaining({
          endedAt: 151_000,
          sessionScoreLabel: 'Okay',
          reflectionLine: 'This session had a mix of steadiness and drift.',
          recoverySuggestion: 'Try a quick reset earlier next time.',
        }),
      );
    });

    await waitFor(() => {
      expect(repositoryMocks.saveMonitoringSession).toHaveBeenLastCalledWith(
        expect.objectContaining({
          endedAt: 151_000,
          sessionScoreLabel: 'Okay',
          reflectionLine: 'This session had a mix of steadiness and drift.',
          recoverySuggestion: 'Try a quick reset earlier next time.',
          insights: ["You didn't take a break this session."],
        }),
      );
    });
  });
});
