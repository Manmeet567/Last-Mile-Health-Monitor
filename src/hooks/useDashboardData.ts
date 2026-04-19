import { useLiveQuery } from 'dexie-react-hooks';
import { buildCombinedDailyOverviews } from '@/core/history/combined-daily-view';
import {
  buildDashboardSummary,
  buildEventFeed,
  buildPostureDistribution,
  buildTrendPoints,
  filterMetricsToRecentDays,
} from '@/core/history/history-selectors';
import {
  buildSymptomSummary,
  filterSymptomCheckInsToRecentDays,
} from '@/core/symptoms/symptom-history';
import { listDailyMetrics } from '@/storage/repositories/daily-metrics.repository';
import { listRecentPostureEvents } from '@/storage/repositories/events.repository';
import {
  getLatestCompletedMonitoringSession,
  listRecentCompletedMonitoringSessions,
} from '@/storage/repositories/sessions.repository';
import { listRecentSymptomCheckIns } from '@/storage/repositories/symptoms.repository';

const DASHBOARD_TREND_DAYS = 7;
const DASHBOARD_METRICS_WINDOW = 14;
const DASHBOARD_SYMPTOM_WINDOW_DAYS = 14;
const DASHBOARD_SYMPTOM_LIMIT = 60;
const DASHBOARD_COMBINED_DAYS = 7;

export function useDashboardData() {
  const snapshot = useLiveQuery(async () => {
    const [
      dailyMetrics,
      recentSessions,
      latestCompletedSession,
      recentEvents,
      symptomCheckIns,
    ] = await Promise.all([
      listDailyMetrics(DASHBOARD_METRICS_WINDOW),
      listRecentCompletedMonitoringSessions(5),
      getLatestCompletedMonitoringSession(),
      listRecentPostureEvents(8),
      listRecentSymptomCheckIns(DASHBOARD_SYMPTOM_LIMIT),
    ]);

    return {
      dailyMetrics,
      recentSessions,
      latestCompletedSession,
      recentEvents,
      symptomCheckIns,
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
      symptomSummary: buildSymptomSummary([]),
      latestDailyOverview: null,
    };
  }

  const recentMetrics = filterMetricsToRecentDays(
    snapshot.dailyMetrics,
    DASHBOARD_TREND_DAYS,
  );
  const recentSymptomCheckIns = filterSymptomCheckInsToRecentDays(
    snapshot.symptomCheckIns,
    DASHBOARD_SYMPTOM_WINDOW_DAYS,
  );

  return {
    isLoading: false,
    trendPoints: buildTrendPoints(recentMetrics, DASHBOARD_TREND_DAYS),
    postureDistribution: buildPostureDistribution(recentMetrics),
    summary: buildDashboardSummary(recentMetrics),
    recentSessions: snapshot.recentSessions,
    latestCompletedSession: snapshot.latestCompletedSession,
    eventFeed: buildEventFeed(snapshot.recentEvents),
    symptomSummary: buildSymptomSummary(recentSymptomCheckIns),
    latestDailyOverview:
      buildCombinedDailyOverviews(
        snapshot.dailyMetrics,
        snapshot.symptomCheckIns,
        DASHBOARD_COMBINED_DAYS,
      )[0] ?? null,
  };
}
