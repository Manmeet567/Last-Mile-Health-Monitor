import { useLiveQuery } from 'dexie-react-hooks';
import {
  buildDashboardSummary,
  buildEventFeed,
  buildPostureDistribution,
  buildTrendPoints,
  summarizeSessions,
} from '@/core/history/history-selectors';
import { listDailyMetrics } from '@/storage/repositories/daily-metrics.repository';
import { listRecentPostureEvents } from '@/storage/repositories/events.repository';
import { listRecentCompletedMonitoringSessions } from '@/storage/repositories/sessions.repository';

const HISTORY_TREND_DAYS = 14;
const HISTORY_METRICS_WINDOW = 30;

export function useHistoryData() {
  const snapshot = useLiveQuery(async () => {
    const [dailyMetrics, recentSessions, recentEvents] = await Promise.all([
      listDailyMetrics(HISTORY_METRICS_WINDOW),
      listRecentCompletedMonitoringSessions(20),
      listRecentPostureEvents(40),
    ]);

    return {
      dailyMetrics,
      recentSessions,
      recentEvents,
    };
  }, []);

  if (!snapshot) {
    return {
      isLoading: true,
      trendPoints: [],
      postureDistribution: [],
      summary: buildDashboardSummary([]),
      sessionSummary: summarizeSessions([]),
      recentSessions: [],
      eventFeed: [],
    };
  }

  return {
    isLoading: false,
    trendPoints: buildTrendPoints(snapshot.dailyMetrics, HISTORY_TREND_DAYS),
    postureDistribution: buildPostureDistribution(snapshot.dailyMetrics),
    summary: buildDashboardSummary(snapshot.dailyMetrics),
    sessionSummary: summarizeSessions(snapshot.recentSessions),
    recentSessions: snapshot.recentSessions,
    eventFeed: buildEventFeed(snapshot.recentEvents),
  };
}
