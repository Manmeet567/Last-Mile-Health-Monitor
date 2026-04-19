import { getPresetSymptomLabel } from '@/core/symptoms/symptom-options';
import type { DailyMetrics, SymptomCheckIn } from '@/types/domain';
import { toDateKey } from '@/utils/date';

export type DailyPostureStateSummary = {
  label: 'Good posture' | 'Mild slouch' | 'Deep slouch';
  seconds: number;
  minutes: number;
  sharePct: number;
};

export type CombinedDailyOverview = {
  dateKey: string;
  label: string;
  monitoringSec: number;
  sittingSec: number;
  totalBreaks: number;
  remindersTriggered: number;
  postureQualityPct: number;
  dominantPostureLabel: DailyPostureStateSummary['label'] | null;
  postureStates: DailyPostureStateSummary[];
  symptomCheckInCount: number;
  symptomsReported: string[];
  averageSymptomSeverity: number;
  workInterferenceReported: boolean;
  symptomFrequency: number;
  hasPostureData: boolean;
  hasSymptomData: boolean;
};

export type CombinedHistoryDateRange = '7d' | '14d' | '30d' | 'all';

export type CombinedHistoryFilters = {
  dateRange: CombinedHistoryDateRange;
  symptomLabel: string | null;
  onlyDaysWithSymptoms: boolean;
  postureStateLabel: DailyPostureStateSummary['label'] | null;
};

export const combinedHistoryDateRangeOptions: Array<{
  id: CombinedHistoryDateRange;
  label: string;
}> = [
  { id: '7d', label: 'Last 7 days' },
  { id: '14d', label: 'Last 14 days' },
  { id: '30d', label: 'Last 30 days' },
  { id: 'all', label: 'All time' },
];

const postureStateFilterOrder: DailyPostureStateSummary['label'][] = [
  'Good posture',
  'Mild slouch',
  'Deep slouch',
];

export function buildCombinedDailyOverviews(
  metrics: DailyMetrics[],
  checkIns: SymptomCheckIn[],
  days: number,
  referenceDate = new Date(),
) {
  if (days <= 0) {
    return [];
  }

  const metricsByDateKey = new Map(
    metrics.map((entry) => [entry.dateKey, entry] as const),
  );
  const checkInsByDateKey = new Map<string, SymptomCheckIn[]>();

  for (const checkIn of checkIns) {
    const currentEntries = checkInsByDateKey.get(checkIn.dateKey) ?? [];
    currentEntries.push(checkIn);
    checkInsByDateKey.set(checkIn.dateKey, currentEntries);
  }

  const overviews: CombinedDailyOverview[] = [];

  for (let offset = 0; offset < days; offset += 1) {
    const date = new Date(referenceDate);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - offset);

    const dateKey = toDateKey(date.getTime());
    const metric = metricsByDateKey.get(dateKey);
    const dateCheckIns = checkInsByDateKey.get(dateKey) ?? [];
    const overview = buildSingleDayOverview(dateKey, date, metric, dateCheckIns);

    if (overview) {
      overviews.push(overview);
    }
  }

  return overviews;
}

export function buildAllCombinedDailyOverviews(
  metrics: DailyMetrics[],
  checkIns: SymptomCheckIn[],
) {
  const dateKeys = new Set<string>();

  for (const entry of metrics) {
    dateKeys.add(entry.dateKey);
  }

  for (const entry of checkIns) {
    dateKeys.add(entry.dateKey);
  }

  const metricsByDateKey = new Map(
    metrics.map((entry) => [entry.dateKey, entry] as const),
  );
  const checkInsByDateKey = new Map<string, SymptomCheckIn[]>();

  for (const checkIn of checkIns) {
    const currentEntries = checkInsByDateKey.get(checkIn.dateKey) ?? [];
    currentEntries.push(checkIn);
    checkInsByDateKey.set(checkIn.dateKey, currentEntries);
  }

  return [...dateKeys]
    .sort((left, right) => right.localeCompare(left))
    .map((dateKey) => {
      const date = new Date(`${dateKey}T00:00:00`);
      return buildSingleDayOverview(
        dateKey,
        date,
        metricsByDateKey.get(dateKey),
        checkInsByDateKey.get(dateKey) ?? [],
      );
    })
    .filter((entry): entry is CombinedDailyOverview => entry !== null);
}

export function getCombinedDailySymptomOptions(
  overviews: CombinedDailyOverview[],
) {
  const labels = new Set<string>();

  for (const overview of overviews) {
    for (const label of overview.symptomsReported) {
      labels.add(label);
    }
  }

  return [...labels].sort((left, right) => left.localeCompare(right));
}

export function getCombinedDailyPostureFilterOptions(
  overviews: CombinedDailyOverview[],
) {
  const labels = new Set<DailyPostureStateSummary['label']>();

  for (const overview of overviews) {
    for (const postureState of overview.postureStates) {
      if (postureState.seconds > 0) {
        labels.add(postureState.label);
      }
    }
  }

  return postureStateFilterOrder.filter((label) => labels.has(label));
}

export function filterCombinedDailyOverviews(
  overviews: CombinedDailyOverview[],
  filters: CombinedHistoryFilters,
  referenceDate = new Date(),
) {
  const minimumDateKey = getMinimumDateKeyForRange(
    filters.dateRange,
    referenceDate,
  );
  const normalizedSymptomLabel = filters.symptomLabel?.toLocaleLowerCase();

  return overviews.filter((overview) => {
    if (minimumDateKey && overview.dateKey < minimumDateKey) {
      return false;
    }

    if (filters.onlyDaysWithSymptoms && !overview.hasSymptomData) {
      return false;
    }

    if (normalizedSymptomLabel) {
      const hasMatchingSymptom = overview.symptomsReported.some(
        (label) => label.toLocaleLowerCase() === normalizedSymptomLabel,
      );

      if (!hasMatchingSymptom) {
        return false;
      }
    }

    if (filters.postureStateLabel) {
      const hasMatchingPostureState = overview.postureStates.some(
        (entry) =>
          entry.label === filters.postureStateLabel && entry.seconds > 0,
      );

      if (!hasMatchingPostureState) {
        return false;
      }
    }

    return true;
  });
}

function buildSingleDayOverview(
  dateKey: string,
  date: Date,
  metric: DailyMetrics | undefined,
  checkIns: SymptomCheckIn[],
) {
  const postureStates = buildPostureStates(metric);
  const dominantPostureLabel =
    postureStates.find((entry) => entry.seconds > 0)?.label ?? null;
  const symptomLabels = getUniqueSymptomLabels(checkIns);
  const symptomCheckInCount = checkIns.length;
  const severityTotal = checkIns.reduce(
    (total, entry) => total + entry.severity,
    0,
  );
  const workInterferenceReported = checkIns.some(
    (entry) => entry.interferedWithWork,
  );
  const symptomFrequency = checkIns.reduce(
    (total, entry) => total + getUniqueSymptomLabels([entry]).length,
    0,
  );
  const hasPostureData =
    (metric?.totalMonitoringSec ?? 0) > 0 || (metric?.totalSittingSec ?? 0) > 0;
  const hasSymptomData = symptomCheckInCount > 0;

  if (!hasPostureData && !hasSymptomData) {
    return null;
  }

  return {
    dateKey,
    label: formatDayLabel(date),
    monitoringSec: metric?.totalMonitoringSec ?? 0,
    sittingSec: metric?.totalSittingSec ?? 0,
    totalBreaks: metric?.totalBreaks ?? 0,
    remindersTriggered: metric?.remindersTriggered ?? 0,
    postureQualityPct:
      (metric?.totalSittingSec ?? 0) > 0
        ? Math.round(
            ((metric?.goodPostureSec ?? 0) / (metric?.totalSittingSec ?? 0)) *
              100,
          )
        : 0,
    dominantPostureLabel,
    postureStates,
    symptomCheckInCount,
    symptomsReported: symptomLabels,
    averageSymptomSeverity:
      symptomCheckInCount > 0
        ? roundToSingleDecimal(severityTotal / symptomCheckInCount)
        : 0,
    workInterferenceReported,
    symptomFrequency,
    hasPostureData,
    hasSymptomData,
  };
}

function buildPostureStates(metric?: DailyMetrics) {
  const totalSittingSec = metric?.totalSittingSec ?? 0;
  const postureStates: DailyPostureStateSummary[] = [
    {
      label: 'Good posture',
      seconds: metric?.goodPostureSec ?? 0,
      minutes: roundToSingleDecimal((metric?.goodPostureSec ?? 0) / 60),
      sharePct:
        totalSittingSec > 0
          ? Math.round(((metric?.goodPostureSec ?? 0) / totalSittingSec) * 100)
          : 0,
    },
    {
      label: 'Mild slouch',
      seconds: metric?.mildSlouchSec ?? 0,
      minutes: roundToSingleDecimal((metric?.mildSlouchSec ?? 0) / 60),
      sharePct:
        totalSittingSec > 0
          ? Math.round(((metric?.mildSlouchSec ?? 0) / totalSittingSec) * 100)
          : 0,
    },
    {
      label: 'Deep slouch',
      seconds: metric?.deepSlouchSec ?? 0,
      minutes: roundToSingleDecimal((metric?.deepSlouchSec ?? 0) / 60),
      sharePct:
        totalSittingSec > 0
          ? Math.round(((metric?.deepSlouchSec ?? 0) / totalSittingSec) * 100)
          : 0,
    },
  ];

  return postureStates.sort((left, right) => right.seconds - left.seconds);
}

function getUniqueSymptomLabels(checkIns: SymptomCheckIn[]) {
  const normalizedLabels = new Map<string, string>();

  for (const checkIn of checkIns) {
    for (const label of [
      ...checkIn.presetSymptoms.map((entry) => getPresetSymptomLabel(entry)),
      ...checkIn.customSymptoms,
    ]) {
      const key = label.toLocaleLowerCase();

      if (!normalizedLabels.has(key)) {
        normalizedLabels.set(key, label);
      }
    }
  }

  return [...normalizedLabels.values()].sort((left, right) =>
    left.localeCompare(right),
  );
}

function formatDayLabel(date: Date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date);
}

function roundToSingleDecimal(value: number) {
  return Math.round(value * 10) / 10;
}

function getMinimumDateKeyForRange(
  dateRange: CombinedHistoryDateRange,
  referenceDate: Date,
) {
  if (dateRange === 'all') {
    return null;
  }

  const days = {
    '7d': 7,
    '14d': 14,
    '30d': 30,
  }[dateRange];

  const date = new Date(referenceDate);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - (days - 1));
  return toDateKey(date.getTime());
}
