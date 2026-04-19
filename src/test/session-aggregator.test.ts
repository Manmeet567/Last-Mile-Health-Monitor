import {
  advanceSessionAccumulator,
  createEmptyDailyMetrics,
  createSessionAccumulator,
  finalizeSessionAccumulator,
  materializeDailyMetricsContributions,
  materializeMonitoringSession,
  mergeDailyMetrics,
  mergeSessionIntoDailyMetrics,
} from '@/core/metrics/session-aggregator';

describe('session aggregator', () => {
  it('accumulates posture-state durations into a monitoring session summary', () => {
    let accumulator = createSessionAccumulator('session-1', 0, 'GOOD_POSTURE');

    accumulator = advanceSessionAccumulator(accumulator, {
      timestamp: 5_000,
      currentState: 'MILD_SLOUCH',
    });
    accumulator = advanceSessionAccumulator(accumulator, {
      timestamp: 8_000,
      currentState: 'AWAY',
    });

    const finalized = finalizeSessionAccumulator(accumulator, 10_000);
    const session = materializeMonitoringSession(finalized, 10_000, 10_000);

    expect(session.totalDurationSec).toBe(10);
    expect(session.goodPostureSec).toBe(5);
    expect(session.mildSlouchSec).toBe(3);
    expect(session.awaySec).toBe(2);
    expect(session.sittingSec).toBe(8);
    expect(session.breakCount).toBe(1);
    expect(session.longestSittingBoutSec).toBe(8);
    expect(session.sittingBoutCount).toBe(1);
  });

  it('tracks multiple sitting bouts and aggregates them into daily metrics', () => {
    let accumulator = createSessionAccumulator('session-2', 0, 'GOOD_POSTURE');

    accumulator = advanceSessionAccumulator(accumulator, {
      timestamp: 4_000,
      currentState: 'AWAY',
    });
    accumulator = advanceSessionAccumulator(accumulator, {
      timestamp: 6_000,
      currentState: 'GOOD_POSTURE',
    });

    const finalized = finalizeSessionAccumulator(accumulator, 9_000);
    const session = materializeMonitoringSession(finalized, 9_000, 9_000);
    const dailyMetrics = mergeSessionIntoDailyMetrics(
      createEmptyDailyMetrics('2026-04-07'),
      session,
    );

    expect(session.breakCount).toBe(1);
    expect(session.sittingBoutCount).toBe(2);
    expect(session.longestSittingBoutSec).toBe(4);
    expect(dailyMetrics.totalMonitoringSec).toBe(9);
    expect(dailyMetrics.totalSittingSec).toBe(7);
    expect(dailyMetrics.totalBreaks).toBe(1);
    expect(dailyMetrics.longestSittingBoutSec).toBe(4);
    expect(dailyMetrics.averageSittingBoutSec).toBe(4);
    expect(dailyMetrics.sittingBoutCount).toBe(2);
  });

  it('splits finalized daily contributions across a midnight boundary', () => {
    const startedAt = new Date(2026, 3, 7, 23, 50, 0, 0).getTime();
    let accumulator = createSessionAccumulator(
      'session-cross-midnight',
      startedAt,
      'GOOD_POSTURE',
    );

    accumulator = advanceSessionAccumulator(accumulator, {
      timestamp: new Date(2026, 3, 8, 0, 10, 0, 0).getTime(),
      currentState: 'AWAY',
    });

    const finalized = finalizeSessionAccumulator(
      accumulator,
      new Date(2026, 3, 8, 0, 15, 0, 0).getTime(),
    );
    const dailyContributions = materializeDailyMetricsContributions(finalized);
    const firstDayKey = new Date(2026, 3, 7, 12, 0, 0, 0)
      .toISOString()
      .slice(0, 10);
    const secondDayKey = new Date(2026, 3, 8, 12, 0, 0, 0)
      .toISOString()
      .slice(0, 10);

    expect(dailyContributions).toEqual([
      expect.objectContaining({
        dateKey: firstDayKey,
        totalMonitoringSec: 600,
        totalSittingSec: 600,
        goodPostureSec: 600,
        totalBreaks: 0,
        longestSittingBoutSec: 600,
        sittingBoutCount: 1,
      }),
      expect.objectContaining({
        dateKey: secondDayKey,
        totalMonitoringSec: 900,
        totalSittingSec: 600,
        goodPostureSec: 600,
        totalBreaks: 1,
        longestSittingBoutSec: 600,
        sittingBoutCount: 1,
      }),
    ]);

    const mergedTodayMetrics = mergeDailyMetrics(
      createEmptyDailyMetrics(secondDayKey),
      dailyContributions[1],
    );

    expect(mergedTodayMetrics.totalMonitoringSec).toBe(900);
    expect(mergedTodayMetrics.totalBreaks).toBe(1);
  });
});
