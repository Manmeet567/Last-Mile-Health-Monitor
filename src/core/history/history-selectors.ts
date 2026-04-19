import type {
  DailyMetrics,
  MonitoringSession,
  PostureEvent,
} from '@/types/domain';
import { toDateKey } from '@/utils/date';

export type TrendPoint = {
  dateKey: string;
  label: string;
  monitoringMinutes: number;
  sittingMinutes: number;
  postureQualityPct: number;
  reminders: number;
  breaks: number;
};

export type PostureDistributionDatum = {
  label: 'Good posture' | 'Mild slouch' | 'Deep slouch';
  value: number;
  minutes: number;
  color: string;
};

export type DashboardSummary = {
  totalMonitoringSec: number;
  totalSittingSec: number;
  totalBreaks: number;
  remindersTriggered: number;
  longestSittingBoutSec: number;
  postureQualityPct: number;
  trackedDays: number;
};

export type EventFeedItem = {
  id: string;
  timestamp: number;
  label: string;
  detail: string;
  tone: 'neutral' | 'good' | 'warning';
};

const postureDistributionPalette: Record<
  PostureDistributionDatum['label'],
  string
> = {
  'Good posture': '#34d399',
  'Mild slouch': '#fbbf24',
  'Deep slouch': '#fb923c',
};

export function filterMetricsToRecentDays(
  metrics: DailyMetrics[],
  days: number,
  referenceDate = new Date(),
): DailyMetrics[] {
  if (days <= 0) {
    return [];
  }

  const recentDateKeys = new Set(getRecentDateKeys(days, referenceDate));
  return metrics.filter((entry) => recentDateKeys.has(entry.dateKey));
}

export function buildTrendPoints(
  metrics: DailyMetrics[],
  days: number,
  referenceDate = new Date(),
): TrendPoint[] {
  const metricsByDateKey = new Map(
    metrics.map((entry) => [entry.dateKey, entry]),
  );
  const points: TrendPoint[] = [];

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(referenceDate);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - offset);

    const dateKey = toDateKey(date.getTime());
    const metric = metricsByDateKey.get(dateKey);
    const totalSittingSec = metric?.totalSittingSec ?? 0;
    const goodPostureSec = metric?.goodPostureSec ?? 0;

    points.push({
      dateKey,
      label: formatDayLabel(date),
      monitoringMinutes: roundToSingleDecimal(
        (metric?.totalMonitoringSec ?? 0) / 60,
      ),
      sittingMinutes: roundToSingleDecimal(totalSittingSec / 60),
      postureQualityPct:
        totalSittingSec > 0
          ? Math.round((goodPostureSec / totalSittingSec) * 100)
          : 0,
      reminders: metric?.remindersTriggered ?? 0,
      breaks: metric?.totalBreaks ?? 0,
    });
  }

  return points;
}

export function buildPostureDistribution(
  metrics: DailyMetrics[],
): PostureDistributionDatum[] {
  const totals = metrics.reduce(
    (accumulator, entry) => {
      accumulator.goodPosture += entry.goodPostureSec;
      accumulator.mildSlouch += entry.mildSlouchSec;
      accumulator.deepSlouch += entry.deepSlouchSec;
      return accumulator;
    },
    {
      goodPosture: 0,
      mildSlouch: 0,
      deepSlouch: 0,
    },
  );

  return [
    createPostureDistributionDatum('Good posture', totals.goodPosture),
    createPostureDistributionDatum('Mild slouch', totals.mildSlouch),
    createPostureDistributionDatum('Deep slouch', totals.deepSlouch),
  ];
}

export function buildDashboardSummary(
  metrics: DailyMetrics[],
): DashboardSummary {
  const aggregate = metrics.reduce(
    (accumulator, entry) => {
      accumulator.totalMonitoringSec += entry.totalMonitoringSec;
      accumulator.totalSittingSec += entry.totalSittingSec;
      accumulator.goodPostureSec += entry.goodPostureSec;
      accumulator.totalBreaks += entry.totalBreaks;
      accumulator.remindersTriggered += entry.remindersTriggered;
      accumulator.longestSittingBoutSec = Math.max(
        accumulator.longestSittingBoutSec,
        entry.longestSittingBoutSec,
      );
      accumulator.trackedDays += entry.totalMonitoringSec > 0 ? 1 : 0;
      return accumulator;
    },
    {
      totalMonitoringSec: 0,
      totalSittingSec: 0,
      goodPostureSec: 0,
      totalBreaks: 0,
      remindersTriggered: 0,
      longestSittingBoutSec: 0,
      trackedDays: 0,
    },
  );

  return {
    totalMonitoringSec: aggregate.totalMonitoringSec,
    totalSittingSec: aggregate.totalSittingSec,
    totalBreaks: aggregate.totalBreaks,
    remindersTriggered: aggregate.remindersTriggered,
    longestSittingBoutSec: aggregate.longestSittingBoutSec,
    postureQualityPct:
      aggregate.totalSittingSec > 0
        ? Math.round(
            (aggregate.goodPostureSec / aggregate.totalSittingSec) * 100,
          )
        : 0,
    trackedDays: aggregate.trackedDays,
  };
}

export function buildEventFeed(events: PostureEvent[]): EventFeedItem[] {
  return [...events]
    .sort((left, right) => right.timestamp - left.timestamp)
    .map((event) => {
      switch (event.type) {
        case 'SESSION_STARTED':
          return createEventFeedItem(
            event,
            'Session started',
            'Local monitoring began.',
            'neutral',
          );
        case 'SESSION_ENDED':
          return createEventFeedItem(
            event,
            'Session ended',
            'This monitoring session was finalized.',
            'neutral',
          );
        case 'MILD_SLOUCH_STARTED':
          return createEventFeedItem(
            event,
            'Mild slouch detected',
            'A sustained mild slouch posture was committed.',
            'warning',
          );
        case 'MILD_SLOUCH_ENDED':
          return createEventFeedItem(
            event,
            'Mild slouch resolved',
            'Posture recovered from the mild slouch window.',
            'good',
          );
        case 'DEEP_SLOUCH_STARTED':
          return createEventFeedItem(
            event,
            'Deep slouch detected',
            'A deep slouch posture was committed.',
            'warning',
          );
        case 'DEEP_SLOUCH_ENDED':
          return createEventFeedItem(
            event,
            'Deep slouch resolved',
            'Posture recovered from the deep slouch window.',
            'good',
          );
        case 'BREAK_STARTED':
          return createEventFeedItem(
            event,
            'Break started',
            'The state machine detected that you stepped away.',
            'good',
          );
        case 'BREAK_ENDED':
          return createEventFeedItem(
            event,
            'Break ended',
            'Monitoring detected a return from break.',
            'neutral',
          );
        case 'REMINDER_TRIGGERED': {
          const reminderType =
            typeof event.metadata?.reminderType === 'string'
              ? event.metadata.reminderType.toLowerCase().replace('_', ' ')
              : 'reminder';
          return createEventFeedItem(
            event,
            'Reminder triggered',
            `A ${reminderType} was shown locally to the user.`,
            'warning',
          );
        }
        default:
          return createEventFeedItem(
            event,
            event.type,
            'A monitoring event was recorded.',
            'neutral',
          );
      }
    });
}

export function summarizeSessions(sessions: MonitoringSession[]) {
  const completedSessions = sessions.filter(
    (session) => session.endedAt !== null,
  );
  const totalMonitoringSec = completedSessions.reduce(
    (accumulator, session) => accumulator + session.totalDurationSec,
    0,
  );
  const totalBreaks = completedSessions.reduce(
    (accumulator, session) => accumulator + session.breakCount,
    0,
  );

  return {
    completedCount: completedSessions.length,
    totalMonitoringSec,
    totalBreaks,
    averageSessionDurationSec:
      completedSessions.length > 0
        ? Math.round(totalMonitoringSec / completedSessions.length)
        : 0,
  };
}

export function calculateSessionQuality(session: MonitoringSession) {
  if (session.goodPosturePercent !== undefined) {
    return session.goodPosturePercent;
  }

  if (session.sittingSec <= 0) {
    return 0;
  }

  return Math.round((session.goodPostureSec / session.sittingSec) * 100);
}

export function getSessionQualityLabel(session: MonitoringSession) {
  return session.sessionScoreLabel ?? deriveSessionQualityLabel(calculateSessionQuality(session));
}

function deriveSessionQualityLabel(qualityPct: number) {
  if (qualityPct >= 70) {
    return 'Good';
  }

  if (qualityPct >= 45) {
    return 'Okay';
  }

  return 'Needs improvement';
}

function createPostureDistributionDatum(
  label: PostureDistributionDatum['label'],
  value: number,
): PostureDistributionDatum {
  return {
    label,
    value,
    minutes: roundToSingleDecimal(value / 60),
    color: postureDistributionPalette[label],
  };
}

function createEventFeedItem(
  event: PostureEvent,
  label: string,
  detail: string,
  tone: EventFeedItem['tone'],
): EventFeedItem {
  return {
    id: event.id,
    timestamp: event.timestamp,
    label,
    detail,
    tone,
  };
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
