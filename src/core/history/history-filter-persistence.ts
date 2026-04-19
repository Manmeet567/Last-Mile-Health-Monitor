import type {
  CombinedHistoryDateRange,
  DailyPostureStateSummary,
} from '@/core/history/combined-daily-view';

export type CombinedHistoryFilterState = {
  dateRange: CombinedHistoryDateRange;
  symptomLabel: string | null;
  onlyDaysWithSymptoms: boolean;
  postureStateLabel: DailyPostureStateSummary['label'] | null;
};

export const defaultCombinedHistoryFilters: CombinedHistoryFilterState = {
  dateRange: '14d',
  symptomLabel: null,
  onlyDaysWithSymptoms: false,
  postureStateLabel: null,
};

const STORAGE_KEY = 'last-mile:combined-history-filters';
const validDateRanges: CombinedHistoryDateRange[] = ['7d', '14d', '30d', 'all'];
const validPostureStates: DailyPostureStateSummary['label'][] = [
  'Good posture',
  'Mild slouch',
  'Deep slouch',
];

export function readPersistedCombinedHistoryFilters() {
  if (typeof window === 'undefined') {
    return defaultCombinedHistoryFilters;
  }

  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY);

    if (!rawValue) {
      return defaultCombinedHistoryFilters;
    }

    const parsedValue = JSON.parse(rawValue) as Partial<CombinedHistoryFilterState>;

    return {
      dateRange: validDateRanges.includes(parsedValue.dateRange ?? '14d')
        ? (parsedValue.dateRange as CombinedHistoryDateRange)
        : defaultCombinedHistoryFilters.dateRange,
      symptomLabel:
        typeof parsedValue.symptomLabel === 'string'
          ? parsedValue.symptomLabel
          : null,
      onlyDaysWithSymptoms:
        typeof parsedValue.onlyDaysWithSymptoms === 'boolean'
          ? parsedValue.onlyDaysWithSymptoms
          : defaultCombinedHistoryFilters.onlyDaysWithSymptoms,
      postureStateLabel:
        parsedValue.postureStateLabel &&
        validPostureStates.includes(parsedValue.postureStateLabel)
          ? parsedValue.postureStateLabel
          : null,
    };
  } catch {
    return defaultCombinedHistoryFilters;
  }
}

export function persistCombinedHistoryFilters(
  filters: CombinedHistoryFilterState,
) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
}

export function sanitizeCombinedHistoryFilters(
  filters: CombinedHistoryFilterState,
  symptomOptions: string[],
  postureOptions: DailyPostureStateSummary['label'][],
  options?: {
    preserveOptionFilters?: boolean;
  },
) {
  return {
    dateRange: validDateRanges.includes(filters.dateRange)
      ? filters.dateRange
      : defaultCombinedHistoryFilters.dateRange,
    symptomLabel:
      options?.preserveOptionFilters
        ? filters.symptomLabel
        : filters.symptomLabel && symptomOptions.includes(filters.symptomLabel)
          ? filters.symptomLabel
          : null,
    onlyDaysWithSymptoms: filters.onlyDaysWithSymptoms,
    postureStateLabel:
      options?.preserveOptionFilters
        ? filters.postureStateLabel
        : filters.postureStateLabel &&
            postureOptions.includes(filters.postureStateLabel)
          ? filters.postureStateLabel
          : null,
  };
}

export function areCombinedHistoryFiltersEqual(
  left: CombinedHistoryFilterState,
  right: CombinedHistoryFilterState,
) {
  return (
    left.dateRange === right.dateRange &&
    left.symptomLabel === right.symptomLabel &&
    left.onlyDaysWithSymptoms === right.onlyDaysWithSymptoms &&
    left.postureStateLabel === right.postureStateLabel
  );
}
