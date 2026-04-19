import { getPresetSymptomLabel } from '@/core/symptoms/symptom-options';
import type { SymptomCheckIn } from '@/types/domain';
import { toDateKey } from '@/utils/date';

export type SymptomSummaryStat = {
  label: string;
  count: number;
  averageSeverity: number;
  lastReportedAt: number;
  workInterferenceCount: number;
};

export type SymptomSummary = {
  checkInCount: number;
  symptomFrequency: number;
  averageSeverity: number;
  workInterferenceCount: number;
  uniqueSymptomCount: number;
  lastReportedAt: number | null;
  mostCommonSymptoms: SymptomSummaryStat[];
  symptomStats: SymptomSummaryStat[];
};

export type SymptomTrendPoint = {
  dateKey: string;
  label: string;
  checkInCount: number;
  averageSeverity: number;
  workInterferenceCount: number;
  symptomFrequency: number;
};

export function filterSymptomCheckInsToRecentDays(
  checkIns: SymptomCheckIn[],
  days: number,
  referenceDate = new Date(),
) {
  if (days <= 0) {
    return [];
  }

  const recentDateKeys = new Set(getRecentDateKeys(days, referenceDate));
  return checkIns.filter((entry) => recentDateKeys.has(entry.dateKey));
}

export function buildSymptomSummary(
  checkIns: SymptomCheckIn[],
): SymptomSummary {
  if (checkIns.length === 0) {
    return {
      checkInCount: 0,
      symptomFrequency: 0,
      averageSeverity: 0,
      workInterferenceCount: 0,
      uniqueSymptomCount: 0,
      lastReportedAt: null,
      mostCommonSymptoms: [],
      symptomStats: [],
    };
  }

  const symptomMap = new Map<
    string,
    {
      label: string;
      count: number;
      severityTotal: number;
      lastReportedAt: number;
      workInterferenceCount: number;
    }
  >();
  let symptomFrequency = 0;
  let severityTotal = 0;
  let workInterferenceCount = 0;
  let lastReportedAt = 0;

  for (const checkIn of checkIns) {
    const symptomLabels = getUniqueSymptomLabels(checkIn);

    symptomFrequency += symptomLabels.length;
    severityTotal += checkIn.severity;
    workInterferenceCount += checkIn.interferedWithWork ? 1 : 0;
    lastReportedAt = Math.max(lastReportedAt, checkIn.createdAt);

    for (const label of symptomLabels) {
      const key = label.toLocaleLowerCase();
      const current = symptomMap.get(key) ?? {
        label,
        count: 0,
        severityTotal: 0,
        lastReportedAt: 0,
        workInterferenceCount: 0,
      };

      current.count += 1;
      current.severityTotal += checkIn.severity;
      current.lastReportedAt = Math.max(
        current.lastReportedAt,
        checkIn.createdAt,
      );
      current.workInterferenceCount += checkIn.interferedWithWork ? 1 : 0;
      symptomMap.set(key, current);
    }
  }

  const symptomStats = [...symptomMap.values()]
    .map((entry) => ({
      label: entry.label,
      count: entry.count,
      averageSeverity: roundToSingleDecimal(entry.severityTotal / entry.count),
      lastReportedAt: entry.lastReportedAt,
      workInterferenceCount: entry.workInterferenceCount,
    }))
    .sort(compareSymptomStats);

  return {
    checkInCount: checkIns.length,
    symptomFrequency,
    averageSeverity: roundToSingleDecimal(severityTotal / checkIns.length),
    workInterferenceCount,
    uniqueSymptomCount: symptomStats.length,
    lastReportedAt,
    mostCommonSymptoms: symptomStats.slice(0, 5),
    symptomStats,
  };
}

export function buildSymptomTrendPoints(
  checkIns: SymptomCheckIn[],
  days: number,
  referenceDate = new Date(),
): SymptomTrendPoint[] {
  const checkInsByDateKey = new Map<string, SymptomCheckIn[]>();

  for (const checkIn of checkIns) {
    const currentEntries = checkInsByDateKey.get(checkIn.dateKey) ?? [];
    currentEntries.push(checkIn);
    checkInsByDateKey.set(checkIn.dateKey, currentEntries);
  }

  const points: SymptomTrendPoint[] = [];

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(referenceDate);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - offset);

    const dateKey = toDateKey(date.getTime());
    const dateCheckIns = checkInsByDateKey.get(dateKey) ?? [];
    const checkInCount = dateCheckIns.length;
    const severityTotal = dateCheckIns.reduce(
      (total, entry) => total + entry.severity,
      0,
    );
    const workInterferenceCount = dateCheckIns.filter(
      (entry) => entry.interferedWithWork,
    ).length;
    const symptomFrequency = dateCheckIns.reduce(
      (total, entry) => total + getUniqueSymptomLabels(entry).length,
      0,
    );

    points.push({
      dateKey,
      label: formatDayLabel(date),
      checkInCount,
      averageSeverity:
        checkInCount > 0
          ? roundToSingleDecimal(severityTotal / checkInCount)
          : 0,
      workInterferenceCount,
      symptomFrequency,
    });
  }

  return points;
}

function getUniqueSymptomLabels(checkIn: SymptomCheckIn) {
  const labels = [
    ...checkIn.presetSymptoms.map((entry) => getPresetSymptomLabel(entry)),
    ...checkIn.customSymptoms,
  ];
  const normalizedLabels = new Map<string, string>();

  for (const label of labels) {
    const key = label.toLocaleLowerCase();

    if (!normalizedLabels.has(key)) {
      normalizedLabels.set(key, label);
    }
  }

  return [...normalizedLabels.values()];
}

function getRecentDateKeys(days: number, referenceDate: Date) {
  const dateKeys: string[] = [];

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(referenceDate);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - offset);
    dateKeys.push(toDateKey(date.getTime()));
  }

  return dateKeys;
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

function compareSymptomStats(
  left: SymptomSummaryStat,
  right: SymptomSummaryStat,
) {
  if (left.count !== right.count) {
    return right.count - left.count;
  }

  if (left.lastReportedAt !== right.lastReportedAt) {
    return right.lastReportedAt - left.lastReportedAt;
  }

  return left.label.localeCompare(right.label);
}
