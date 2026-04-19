import { useLiveQuery } from 'dexie-react-hooks';
import { buildAllCombinedDailyOverviews } from '@/core/history/combined-daily-view';
import {
  buildDashboardSummary,
  buildEventFeed,
  buildPostureDistribution,
  buildTrendPoints,
  summarizeSessions,
} from '@/core/history/history-selectors';
import {
  buildSymptomSummary,
  buildSymptomTrendPoints,
} from '@/core/symptoms/symptom-history';
import {
  listAllDailyMetrics,
  listDailyMetrics,
} from '@/storage/repositories/daily-metrics.repository';
import { listRecentPostureEvents } from '@/storage/repositories/events.repository';
import { listRecentCompletedMonitoringSessions } from '@/storage/repositories/sessions.repository';
import {
  listAllSymptomCheckIns,
  listRecentSymptomCheckIns,
} from '@/storage/repositories/symptoms.repository';

const HISTORY_TREND_DAYS = 14;
const HISTORY_METRICS_WINDOW = 30;
const HISTORY_SYMPTOM_TREND_DAYS = 30;
const HISTORY_SYMPTOM_LIMIT = 120;
export function useHistoryData() {
  const snapshot = useLiveQuery(async () => {
    const [
      recentDailyMetrics,
      allDailyMetrics,
      recentSessions,
      recentEvents,
      recentSymptomCheckIns,
      allSymptomCheckIns,
    ] = await Promise.all([
      listDailyMetrics(HISTORY_METRICS_WINDOW),
      listAllDailyMetrics(),
      listRecentCompletedMonitoringSessions(20),
      listRecentPostureEvents(40),
      listRecentSymptomCheckIns(HISTORY_SYMPTOM_LIMIT),
      listAllSymptomCheckIns(),
    ]);

    return {
      recentDailyMetrics,
      allDailyMetrics,
      recentSessions,
      recentEvents,
      recentSymptomCheckIns,
      allSymptomCheckIns,
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
      symptomSummary: buildSymptomSummary([]),
      symptomTrendPoints: buildSymptomTrendPoints(
        [],
        HISTORY_SYMPTOM_TREND_DAYS,
      ),
      combinedDailyOverviews: [],
    };
  }

  return {
    isLoading: false,
    trendPoints: buildTrendPoints(
      snapshot.recentDailyMetrics,
      HISTORY_TREND_DAYS,
    ),
    postureDistribution: buildPostureDistribution(snapshot.recentDailyMetrics),
    summary: buildDashboardSummary(snapshot.recentDailyMetrics),
    sessionSummary: summarizeSessions(snapshot.recentSessions),
    recentSessions: snapshot.recentSessions,
    eventFeed: buildEventFeed(snapshot.recentEvents),
    symptomSummary: buildSymptomSummary(snapshot.recentSymptomCheckIns),
    symptomTrendPoints: buildSymptomTrendPoints(
      snapshot.recentSymptomCheckIns,
      HISTORY_SYMPTOM_TREND_DAYS,
    ),
    combinedDailyOverviews: buildAllCombinedDailyOverviews(
      snapshot.allDailyMetrics,
      snapshot.allSymptomCheckIns,
    ),
  };
}
