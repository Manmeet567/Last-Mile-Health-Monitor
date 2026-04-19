import { useEffect, useMemo, useState } from 'react';
import {
  combinedHistoryDateRangeOptions,
  filterCombinedDailyOverviews,
  getCombinedDailyPostureFilterOptions,
  getCombinedDailySymptomOptions,
} from '@/core/history/combined-daily-view';
import {
  areCombinedHistoryFiltersEqual,
  defaultCombinedHistoryFilters,
  persistCombinedHistoryFilters,
  readPersistedCombinedHistoryFilters,
  sanitizeCombinedHistoryFilters,
} from '@/core/history/history-filter-persistence';
import {
  DailyTimelineSection,
  HistoryFilterBar,
  HistoryHero,
  HistoryInsightsTabs,
  HistorySummaryStrip,
} from '@/components/history/history-page-sections';
import { useHistoryData } from '@/hooks/useHistoryData';

export function HistoryPage() {
  const history = useHistoryData();
  const [filters, setFilters] = useState(readPersistedCombinedHistoryFilters);

  const symptomFilterOptions = useMemo(
    () => getCombinedDailySymptomOptions(history.combinedDailyOverviews),
    [history.combinedDailyOverviews],
  );
  const postureFilterOptions = useMemo(
    () => getCombinedDailyPostureFilterOptions(history.combinedDailyOverviews),
    [history.combinedDailyOverviews],
  );

  const safeFilters = useMemo(
    () =>
      sanitizeCombinedHistoryFilters(
        filters,
        symptomFilterOptions,
        postureFilterOptions,
        {
          preserveOptionFilters: history.isLoading,
        },
      ),
    [filters, history.isLoading, postureFilterOptions, symptomFilterOptions],
  );

  const filteredCombinedDailyOverviews = useMemo(
    () => filterCombinedDailyOverviews(history.combinedDailyOverviews, safeFilters),
    [history.combinedDailyOverviews, safeFilters],
  );

  const hasActiveFilters = !areCombinedHistoryFiltersEqual(
    safeFilters,
    defaultCombinedHistoryFilters,
  );

  useEffect(() => {
    const nextSafeFilters = sanitizeCombinedHistoryFilters(
      filters,
      symptomFilterOptions,
      postureFilterOptions,
      {
        preserveOptionFilters: history.isLoading,
      },
    );

    if (!areCombinedHistoryFiltersEqual(filters, nextSafeFilters)) {
      setFilters(nextSafeFilters);
      return;
    }

    persistCombinedHistoryFilters(nextSafeFilters);
  }, [filters, history.isLoading, postureFilterOptions, symptomFilterOptions]);

  return (
    <div className="space-y-7">
      <HistoryHero />

      <HistorySummaryStrip
        sessionSummary={history.sessionSummary}
        summary={history.summary}
      />

      <HistoryFilterBar
        dateRangeOptions={combinedHistoryDateRangeOptions}
        filters={safeFilters}
        hasActiveFilters={hasActiveFilters}
        postureOptions={postureFilterOptions}
        symptomOptions={symptomFilterOptions}
        onChange={setFilters}
        onReset={() => {
          setFilters(defaultCombinedHistoryFilters);
        }}
      />

      <DailyTimelineSection
        combinedDailyOverviews={filteredCombinedDailyOverviews}
        isLoading={history.isLoading}
      />

      <HistoryInsightsTabs
        eventFeed={history.eventFeed}
        isLoading={history.isLoading}
        postureDistribution={history.postureDistribution}
        recentSessions={history.recentSessions}
        symptomSummary={history.symptomSummary}
        symptomTrendPoints={history.symptomTrendPoints}
        trendPoints={history.trendPoints}
      />
    </div>
  );
}
