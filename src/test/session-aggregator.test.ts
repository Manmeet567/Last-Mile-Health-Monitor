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
    const dailyMetrics = mergeSessionIntoDailyMetrics(createEmptyDailyMetrics('2026-04-07'), session);

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
    const startedAt = Date.parse('2026-04-07T23:50:00.000Z');
    let accumulator = createSessionAccumulator('session-cross-midnight', startedAt, 'GOOD_POSTURE');

    accumulator = advanceSessionAccumulator(accumulator, {
      timestamp: Date.parse('2026-04-08T00:10:00.000Z'),
      currentState: 'AWAY',
    });

    const finalized = finalizeSessionAccumulator(
      accumulator,
      Date.parse('2026-04-08T00:15:00.000Z'),
    );
    const dailyContributions = materializeDailyMetricsContributions(finalized);

    expect(dailyContributions).toEqual([
      expect.objectContaining({
        dateKey: '2026-04-07',
        totalMonitoringSec: 600,
        totalSittingSec: 600,
        goodPostureSec: 600,
        totalBreaks: 0,
        longestSittingBoutSec: 600,
        sittingBoutCount: 1,
      }),
      expect.objectContaining({
        dateKey: '2026-04-08',
        totalMonitoringSec: 900,
        totalSittingSec: 600,
        goodPostureSec: 600,
        totalBreaks: 1,
        longestSittingBoutSec: 600,
        sittingBoutCount: 1,
      }),
    ]);

    const mergedTodayMetrics = mergeDailyMetrics(
      createEmptyDailyMetrics('2026-04-08'),
      dailyContributions[1],
    );

    expect(mergedTodayMetrics.totalMonitoringSec).toBe(900);
    expect(mergedTodayMetrics.totalBreaks).toBe(1);
  });
});
