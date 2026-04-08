import { useLiveQuery } from 'dexie-react-hooks';
import {
  buildDashboardSummary,
  buildEventFeed,
  buildPostureDistribution,
  buildTrendPoints,
  filterMetricsToRecentDays,
} from '@/core/history/history-selectors';
import { listDailyMetrics } from '@/storage/repositories/daily-metrics.repository';
import { listRecentPostureEvents } from '@/storage/repositories/events.repository';
import {
  getLatestCompletedMonitoringSession,
  listRecentCompletedMonitoringSessions,
} from '@/storage/repositories/sessions.repository';

const DASHBOARD_TREND_DAYS = 7;
const DASHBOARD_METRICS_WINDOW = 14;

export function useDashboardData() {
  const snapshot = useLiveQuery(async () => {
    const [dailyMetrics, recentSessions, latestCompletedSession, recentEvents] = await Promise.all([
      listDailyMetrics(DASHBOARD_METRICS_WINDOW),
      listRecentCompletedMonitoringSessions(5),
      getLatestCompletedMonitoringSession(),
      listRecentPostureEvents(8),
    ]);

    return {
      dailyMetrics,
      recentSessions,
      latestCompletedSession,
      recentEvents,
    };
  }, []);

  if (!snapshot) {
    return {
      isLoading: true,
      trendPoints: [],
      postureDistribution: [],
      summary: buildDashboardSummary([]),
      recentSessions: [],
      latestCompletedSession: null,
      eventFeed: [],
    };
  }

  const recentMetrics = filterMetricsToRecentDays(snapshot.dailyMetrics, DASHBOARD_TREND_DAYS);

  return {
    isLoading: false,
    trendPoints: buildTrendPoints(recentMetrics, DASHBOARD_TREND_DAYS),
    postureDistribution: buildPostureDistribution(recentMetrics),
    summary: buildDashboardSummary(recentMetrics),
    recentSessions: snapshot.recentSessions,
    latestCompletedSession: snapshot.latestCompletedSession,
    eventFeed: buildEventFeed(snapshot.recentEvents),
  };
}
