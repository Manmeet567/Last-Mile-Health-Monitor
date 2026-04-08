import {
  buildDashboardSummary,
  buildEventFeed,
  buildPostureDistribution,
  buildTrendPoints,
  calculateSessionQuality,
  filterMetricsToRecentDays,
  summarizeSessions,
} from '@/core/history/history-selectors';
import type { DailyMetrics, MonitoringSession, PostureEvent } from '@/types/domain';

describe('history selectors', () => {
  const metrics: DailyMetrics[] = [
    {
      dateKey: '2026-04-05',
      totalMonitoringSec: 2400,
      totalSittingSec: 1800,
      goodPostureSec: 1200,
      mildSlouchSec: 420,
      deepSlouchSec: 180,
      totalBreaks: 2,
      longestSittingBoutSec: 900,
      averageSittingBoutSec: 600,
      remindersTriggered: 1,
      sittingBoutCount: 3,
    },
    {
      dateKey: '2026-04-07',
      totalMonitoringSec: 3600,
      totalSittingSec: 3000,
      goodPostureSec: 2100,
      mildSlouchSec: 600,
      deepSlouchSec: 300,
      totalBreaks: 3,
      longestSittingBoutSec: 1200,
      averageSittingBoutSec: 750,
      remindersTriggered: 2,
      sittingBoutCount: 4,
    },
    {
      dateKey: '2026-04-08',
      totalMonitoringSec: 1800,
      totalSittingSec: 1500,
      goodPostureSec: 900,
      mildSlouchSec: 420,
      deepSlouchSec: 180,
      totalBreaks: 1,
      longestSittingBoutSec: 900,
      averageSittingBoutSec: 750,
      remindersTriggered: 1,
      sittingBoutCount: 2,
    },
  ];

  it('filters metrics to a real recent-day calendar window', () => {
    const recentMetrics = filterMetricsToRecentDays(metrics, 2, new Date('2026-04-08T12:00:00Z'));
    const summary = buildDashboardSummary(recentMetrics);

    expect(recentMetrics.map((entry) => entry.dateKey)).toEqual(['2026-04-07', '2026-04-08']);
    expect(summary.totalMonitoringSec).toBe(5400);
    expect(summary.totalBreaks).toBe(4);
  });

  it('builds zero-filled trend points across the requested day window', () => {
    const trendPoints = buildTrendPoints(metrics, 3, new Date('2026-04-08T12:00:00Z'));

    expect(trendPoints).toHaveLength(3);
    expect(trendPoints[0]).toMatchObject({ dateKey: '2026-04-06', monitoringMinutes: 0 });
    expect(trendPoints[1]).toMatchObject({ dateKey: '2026-04-07', monitoringMinutes: 60, postureQualityPct: 70 });
    expect(trendPoints[2]).toMatchObject({ dateKey: '2026-04-08', sittingMinutes: 25, reminders: 1 });
  });

  it('aggregates dashboard summary and posture distribution', () => {
    const summary = buildDashboardSummary(metrics);
    const distribution = buildPostureDistribution(metrics);

    expect(summary.totalMonitoringSec).toBe(7800);
    expect(summary.totalBreaks).toBe(6);
    expect(summary.remindersTriggered).toBe(4);
    expect(summary.longestSittingBoutSec).toBe(1200);
    expect(summary.postureQualityPct).toBe(67);
    expect(distribution).toEqual([
      expect.objectContaining({ label: 'Good posture', value: 4200 }),
      expect.objectContaining({ label: 'Mild slouch', value: 1440 }),
      expect.objectContaining({ label: 'Deep slouch', value: 660 }),
    ]);
  });

  it('summarizes completed sessions and session quality', () => {
    const sessions: MonitoringSession[] = [
      {
        id: 'session-1',
        startedAt: 1,
        endedAt: 11,
        totalDurationSec: 10,
        activeMonitoringSec: 10,
        sittingSec: 8,
        goodPostureSec: 6,
        mildSlouchSec: 2,
        deepSlouchSec: 0,
        movingSec: 0,
        awaySec: 2,
        breakCount: 1,
        longestSittingBoutSec: 8,
        sittingBoutCount: 1,
      },
      {
        id: 'session-2',
        startedAt: 20,
        endedAt: 44,
        totalDurationSec: 24,
        activeMonitoringSec: 24,
        sittingSec: 18,
        goodPostureSec: 9,
        mildSlouchSec: 6,
        deepSlouchSec: 3,
        movingSec: 0,
        awaySec: 6,
        breakCount: 2,
        longestSittingBoutSec: 10,
        sittingBoutCount: 2,
      },
    ];

    const sessionSummary = summarizeSessions(sessions);

    expect(sessionSummary.completedCount).toBe(2);
    expect(sessionSummary.totalMonitoringSec).toBe(34);
    expect(sessionSummary.totalBreaks).toBe(3);
    expect(sessionSummary.averageSessionDurationSec).toBe(17);
    expect(calculateSessionQuality(sessions[0])).toBe(75);
    expect(calculateSessionQuality(sessions[1])).toBe(50);
  });

  it('maps stored events into a user-facing feed', () => {
    const events: PostureEvent[] = [
      {
        id: 'event-1',
        type: 'REMINDER_TRIGGERED',
        timestamp: 200,
        metadata: {
          reminderType: 'BREAK_NUDGE',
        },
      },
      {
        id: 'event-2',
        type: 'BREAK_STARTED',
        timestamp: 100,
      },
    ];

    const feed = buildEventFeed(events);

    expect(feed).toEqual([
      expect.objectContaining({
        id: 'event-1',
        label: 'Reminder triggered',
        detail: 'A break nudge was shown locally to the user.',
        tone: 'warning',
      }),
      expect.objectContaining({
        id: 'event-2',
        label: 'Break started',
        tone: 'good',
      }),
    ]);
  });
});
