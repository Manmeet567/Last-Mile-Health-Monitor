import { getPresetSymptomLabel, symptomPresetGroups } from '@/core/symptoms/symptom-options';
import { DashboardCard } from '@/components/ui/dashboard-card';
import { DashboardLinkButton } from '@/components/ui/dashboard-button';
import { SkeletonBlock } from '@/components/ui/skeleton-block';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useSymptomCheckIns } from '@/hooks/useSymptomCheckIns';
import { toDateKey } from '@/utils/date';
import type { SymptomCheckIn } from '@/types/domain';

export function DashboardPage() {
  const dashboard = useDashboardData();
  const symptomCheckIns = useSymptomCheckIns();

  if (dashboard.isLoading || symptomCheckIns.isLoading) {
    return <DashboardLoadingState />;
  }

  const todayDateKey = toDateKey(Date.now());
  const latestDailyOverview = dashboard.latestDailyOverview;
  const latestOverviewIsToday = latestDailyOverview?.dateKey === todayDateKey;
  const todayMonitoringSec =
    latestOverviewIsToday && latestDailyOverview?.hasPostureData
      ? latestDailyOverview.monitoringSec
      : 0;
  const todayBreaks =
    latestOverviewIsToday && latestDailyOverview?.hasPostureData
      ? latestDailyOverview.totalBreaks
      : 0;
  const todaySymptomsCount =
    latestOverviewIsToday && latestDailyOverview?.hasSymptomData
      ? latestDailyOverview.symptomsReported.length
      : symptomCheckIns.todayCheckIn
        ? getSymptomLabels(symptomCheckIns.todayCheckIn).length
        : 0;
  const lastStatus =
    latestOverviewIsToday && latestDailyOverview?.hasPostureData
      ? latestDailyOverview.dominantPostureLabel ?? 'Posture recorded'
      : 'No posture yet';
  const postureTone = getPostureTone(
    latestDailyOverview?.postureQualityPct ?? 0,
    latestDailyOverview?.hasPostureData ?? false,
  );
  const lastStatusClassName = getLastStatusClassName(lastStatus, postureTone);
  const recentSymptomEntries = symptomCheckIns.recentCheckIns.slice(0, 3);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.82fr)_minmax(338px,1fr)]">
        <div className="space-y-6">
          <DashboardCard glow="blue" className="p-6 lg:p-7">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#7EA8E6]">
                  Desk Health
                </p>
                <h1 className="mt-3 text-[2.25rem] font-semibold leading-[1.04] tracking-[-0.045em] text-[#F6FAFF] sm:text-[2.58rem]">
                  {getGreetingHeading()}
                </h1>
                <p className="mt-2.5 text-[0.98rem] text-[#9EB1D0] sm:text-[1.04rem]">
                  {formatLongDate(Date.now())}
                </p>
              </div>
              <TrackingBadge isActive={latestOverviewIsToday || Boolean(symptomCheckIns.todayCheckIn)} />
            </div>
          </DashboardCard>

          <DashboardCard className="p-7 lg:p-8">
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-[1.9rem] font-semibold tracking-[-0.035em] text-[#F3F7FF]">
                  Today&apos;s Summary
                </h2>
                <p className="mt-2 text-[0.95rem] text-[#8FA4C8]">
                  A local snapshot of what has been recorded in this browser.
                </p>
              </div>
              <p className="pt-1 text-[0.95rem] font-medium text-[#8FA4C8]">
                {formatMonthDay(Date.now())}
              </p>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <MiniStatCard
                icon="clock"
                label="Monitoring"
                value={formatHoursAndMinutes(todayMonitoringSec)}
                detail={
                  latestOverviewIsToday
                    ? 'Recorded in local posture history'
                    : 'No monitoring saved today yet'
                }
              />
              <MiniStatCard
                icon="status"
                label="Last status"
                value={lastStatus}
                detail={
                  latestOverviewIsToday
                    ? "Based on today's latest posture rollup"
                    : 'Start tracking to see data'
                }
                valueClassName={lastStatusClassName}
              />
              <MiniStatCard
                icon="symptom"
                label="Symptoms"
                value={String(todaySymptomsCount)}
                detail={
                  symptomCheckIns.todayCheckIn
                    ? `Last check-in ${formatShortTime(symptomCheckIns.todayCheckIn.createdAt)}`
                    : 'No symptom check-in saved today'
                }
              />
              <MiniStatCard
                icon="break"
                label="Breaks taken"
                value={String(todayBreaks)}
                detail={
                  latestOverviewIsToday
                    ? `Recent 14-day target context: ${dashboard.summary.totalBreaks} stored breaks`
                    : 'No breaks recorded yet'
                }
              />
            </div>
          </DashboardCard>

          <div className="space-y-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#7EA8E6]">
              Quick Actions
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <DashboardLinkButton
                to="/posture?mode=live"
                variant="primary"
                className="min-w-[12.75rem] justify-center"
              >
                <ActionGlyph name="pulse" />
                Start tracking
              </DashboardLinkButton>
              <DashboardLinkButton
                to="/symptoms"
                variant="secondary"
                className="min-w-[11.25rem] justify-center"
              >
                <ActionGlyph name="heart" />
                Log symptoms
              </DashboardLinkButton>
              <DashboardLinkButton
                to="/history"
                variant="secondary"
                className="min-w-[11.25rem] justify-center"
              >
                <ActionGlyph name="calendar" />
                View history
              </DashboardLinkButton>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <DashboardCard className="p-6" glow="green">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-[1.65rem] font-semibold tracking-[-0.03em] text-[#F3F7FF]">
                  Posture Snapshot
                </h2>
                <p className="mt-1.5 text-[0.92rem] text-[#8FA4C8]">
                  Latest recorded posture mix
                </p>
              </div>
              <StatusPill
                label={postureTone.label}
                tone={postureTone.pillTone}
              />
            </div>

            <div className="mt-5 overflow-hidden rounded-full bg-[#1B2642]">
              <div className="flex h-3 w-full">
                {buildPostureSegments(latestDailyOverview).map((segment) => (
                  <div
                    key={segment.label}
                    className={`${segment.colorClassName} transition-[width] duration-[420ms] ease-out`}
                    style={{ width: `${segment.widthPct}%` }}
                  />
                ))}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[0.92rem] text-[#A7B7D6]">
              {buildPostureSegments(latestDailyOverview).map((segment) => (
                <div key={segment.label} className="flex items-center gap-2">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${segment.colorClassName}`}
                  />
                  <span>
                    {segment.label} {segment.widthPct}%
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-[16px] bg-[#1A2542] px-4 py-3.5 text-[0.92rem] text-[#B9C9E3]">
              {latestDailyOverview?.hasPostureData ? (
                <>
                  {latestDailyOverview.label} - {formatHoursAndMinutes(latestDailyOverview.monitoringSec)} monitored
                </>
              ) : (
                'Start tracking to see data in this posture snapshot.'
              )}
            </div>

            <DashboardLinkButton
              to="/posture"
              variant="secondary"
              className="mt-5 w-full justify-center"
            >
              Open Posture
            </DashboardLinkButton>
          </DashboardCard>

          <DashboardCard className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-[1.65rem] font-semibold tracking-[-0.03em] text-[#F3F7FF]">
                  Symptom Summary
                </h2>
                <p className="mt-1.5 text-[0.92rem] text-[#8FA4C8]">
                  Recent local symptom entries
                </p>
              </div>
              <p className="pt-1 text-[0.92rem] font-medium text-[#8FA4C8]">Today</p>
            </div>

            <div className="mt-5 space-y-3">
              {recentSymptomEntries.length > 0 ? (
                recentSymptomEntries.map((entry) => (
                  <SymptomRow key={entry.id} entry={entry} />
                ))
              ) : (
                <div className="rounded-[18px] border border-dashed border-white/8 bg-[#19233E] px-4 py-5 text-sm leading-6 text-[#93A7C7]">
                  No symptom check-ins yet. Log symptoms to see data in this
                  summary.
                </div>
              )}
            </div>

            <DashboardLinkButton
              to="/symptoms"
              variant="secondary"
              className="mt-5 w-full justify-center"
            >
              Log new symptom
            </DashboardLinkButton>
          </DashboardCard>

          <DashboardCard className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-[#163156] text-[#6BCBFF]">
                <ActionGlyph name="continue" />
              </div>
              <div className="min-w-0">
                <h2 className="text-[1.55rem] font-semibold tracking-[-0.03em] text-[#F3F7FF]">
                  Continue where you left off
                </h2>
                <p className="mt-2.5 text-[0.95rem] leading-6 text-[#A7B7D6]">
                  {latestDailyOverview
                    ? `Your latest local record is ${latestDailyOverview.label}. Re-open posture tracking or review the combined history to continue from there.`
                    : 'Start with posture tracking or a symptom check-in to begin your local desk-health record.'}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <DashboardLinkButton
                    to="/posture?mode=live"
                    variant="primary"
                    className="min-w-[10.5rem]"
                  >
                    Resume posture
                  </DashboardLinkButton>
                  <DashboardLinkButton to="/history" variant="ghost">
                    Review history
                  </DashboardLinkButton>
                </div>
              </div>
            </div>
          </DashboardCard>
        </div>
      </div>
    </div>
  );
}

function TrackingBadge({ isActive }: { isActive: boolean }) {
  return (
    <div
      className={[
        'inline-flex items-center gap-2.5 rounded-full px-4 py-2.5 text-[0.92rem] font-semibold',
        isActive
          ? 'border border-[#4ADE80]/30 bg-[#173126] text-[#4ADE80]'
          : 'border border-white/8 bg-[#1A2542] text-[#A7B7D6]',
      ].join(' ')}
    >
      <span
        className={[
          'h-2.5 w-2.5 rounded-full',
          isActive ? 'bg-[#4ADE80]' : 'bg-[#8798B6]',
        ].join(' ')}
      />
      {isActive ? 'Tracking active' : 'Ready to track'}
    </div>
  );
}

type MiniStatCardProps = {
  icon: 'clock' | 'status' | 'symptom' | 'break';
  label: string;
  value: string;
  detail: string;
  valueClassName?: string;
};

function MiniStatCard({
  icon,
  label,
  value,
  detail,
  valueClassName,
}: MiniStatCardProps) {
  return (
    <div className="min-h-[9.2rem] rounded-[16px] bg-[#1A2542] px-5 py-[1.125rem]">
      <div className="flex items-center gap-2.5 text-[#6F88AF]">
        <ActionGlyph name={icon} />
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#7A8FBA]">
          {label}
        </p>
      </div>
      <p
        className={[
          'mt-5 text-[1.95rem] font-semibold leading-none tracking-[-0.04em] text-[#F4F8FF]',
          valueClassName ?? '',
        ].join(' ')}
      >
        {value}
      </p>
      <p className="mt-2.5 text-[0.92rem] leading-6 text-[#8499BB]">{detail}</p>
    </div>
  );
}

function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: 'green' | 'yellow' | 'red' | 'neutral';
}) {
  const className = {
    green: 'border-[#4ADE80]/30 bg-[#173126] text-[#4ADE80]',
    yellow: 'border-[#FBBF24]/30 bg-[#362A14] text-[#FBBF24]',
    red: 'border-[#F2A2A2]/28 bg-[#352126] text-[#F2A2A2]',
    neutral: 'border-white/8 bg-[#1A2542] text-[#A7B7D6]',
  }[tone];

  return (
    <div className={`rounded-full border px-3.5 py-2 text-[0.88rem] font-semibold ${className}`}>
      {label}
    </div>
  );
}

function SymptomRow({ entry }: { entry: SymptomCheckIn }) {
  const labels = getSymptomLabels(entry);
  const primaryLabel = labels[0] ?? 'Symptom entry';
  const category = getSymptomCategory(entry);

  return (
    <div className="flex items-center justify-between gap-4 rounded-[16px] bg-[#1A2542] px-4 py-3.5">
      <div className="min-w-0">
        <p className="truncate text-[1.02rem] font-semibold text-[#F4F8FF]">
          {primaryLabel}
        </p>
        <p className="mt-1 text-[0.9rem] text-[#8FA4C8]">
          {category} - {formatRelativeTime(entry.createdAt)}
        </p>
      </div>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#FBBF24]/25 bg-[#2B2A29] text-[0.88rem] font-semibold text-[#FBBF24]">
        {entry.severity}
      </div>
    </div>
  );
}

function buildPostureSegments(
  overview: ReturnType<typeof useDashboardData>['latestDailyOverview'],
) {
  if (!overview?.hasPostureData) {
    return [
      { label: 'Good', widthPct: 0, colorClassName: 'bg-[#4ADE80]' },
      { label: 'Fair', widthPct: 0, colorClassName: 'bg-[#FBBF24]' },
      { label: 'Poor', widthPct: 0, colorClassName: 'bg-[#F87171]' },
    ];
  }

  const good = overview.postureStates.find(
    (entry) => entry.label === 'Good posture',
  )?.sharePct ?? 0;
  const fair =
    overview.postureStates.find((entry) => entry.label === 'Mild slouch')
      ?.sharePct ?? 0;
  const poor =
    overview.postureStates.find((entry) => entry.label === 'Deep slouch')
      ?.sharePct ?? 0;

  return [
    { label: 'Good', widthPct: good, colorClassName: 'bg-[#4ADE80]' },
    { label: 'Fair', widthPct: fair, colorClassName: 'bg-[#FBBF24]' },
    { label: 'Poor', widthPct: poor, colorClassName: 'bg-[#F87171]' },
  ];
}

function getPostureTone(score: number, hasData: boolean) {
  if (!hasData) {
    return {
      label: 'Waiting',
      pillTone: 'neutral' as const,
      textClassName: 'text-[#EAF2FF]',
    };
  }

  if (score >= 60) {
    return {
      label: 'Good',
      pillTone: 'green' as const,
      textClassName: 'text-[#4ADE80]',
    };
  }

  if (score >= 35) {
    return {
      label: 'Fair',
      pillTone: 'yellow' as const,
      textClassName: 'text-[#FBBF24]',
    };
  }

  return {
    label: 'Focus',
    pillTone: 'red' as const,
    textClassName: 'text-[#D8C29C]',
  };
}

function getLastStatusClassName(
  lastStatus: string,
  postureTone: ReturnType<typeof getPostureTone>,
) {
  if (lastStatus === 'Posture recorded') {
    return 'font-medium text-[#D3DDED]';
  }

  if (lastStatus === 'No posture yet') {
    return 'font-medium text-[#C5D1E4]';
  }

  return postureTone.textClassName;
}

function getGreetingHeading() {
  const hour = new Date().getHours();

  if (hour < 12) {
    return 'Good morning';
  }

  if (hour < 18) {
    return 'Good afternoon';
  }

  return 'Good evening';
}

function getSymptomLabels(entry: SymptomCheckIn) {
  return [
    ...entry.presetSymptoms.map((symptom) => getPresetSymptomLabel(symptom)),
    ...entry.customSymptoms,
  ];
}

function getSymptomCategory(entry: SymptomCheckIn) {
  const firstPreset = entry.presetSymptoms[0];

  if (!firstPreset) {
    return 'Custom symptom';
  }

  const matchingGroup = symptomPresetGroups.find((group) =>
    group.items.some((item) => item.id === firstPreset),
  );

  return matchingGroup?.title ?? 'Local symptom';
}

function formatLongDate(timestamp: number) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(timestamp);
}

function formatMonthDay(timestamp: number) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(timestamp);
}

function formatShortTime(timestamp: number) {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(timestamp);
}

function formatRelativeTime(timestamp: number) {
  const diffMs = Date.now() - timestamp;
  const diffMinutes = Math.max(Math.round(diffMs / 60000), 0);

  if (diffMinutes < 60) {
    return `${diffMinutes || 1} min ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);

  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function formatHoursAndMinutes(totalSeconds: number) {
  if (totalSeconds <= 0) {
    return '0m';
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}

function ActionGlyph({
  name,
}: {
  name: 'pulse' | 'heart' | 'calendar' | 'clock' | 'status' | 'symptom' | 'break' | 'continue';
}) {
  const commonProps = {
    className: 'h-4 w-4',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };

  switch (name) {
    case 'pulse':
      return (
        <svg viewBox="0 0 24 24" {...commonProps}>
          <path d="M4 12h4l2-5 4 10 2-5h4" />
        </svg>
      );
    case 'heart':
      return (
        <svg viewBox="0 0 24 24" {...commonProps}>
          <path d="M12 21c-4.6-3.2-8-6-8-10.4A4.6 4.6 0 0 1 8.6 6c1.5 0 2.8.7 3.4 1.9A3.8 3.8 0 0 1 15.4 6 4.6 4.6 0 0 1 20 10.6C20 15 16.6 17.8 12 21Z" />
        </svg>
      );
    case 'calendar':
      return (
        <svg viewBox="0 0 24 24" {...commonProps}>
          <path d="M7 3v4" />
          <path d="M17 3v4" />
          <rect x="4" y="5" width="16" height="15" rx="2" />
          <path d="M4 10h16" />
        </svg>
      );
    case 'clock':
      return (
        <svg viewBox="0 0 24 24" {...commonProps}>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 8v4l3 2" />
        </svg>
      );
    case 'status':
      return (
        <svg viewBox="0 0 24 24" {...commonProps}>
          <circle cx="12" cy="12" r="8" />
          <path d="m8.5 12 2.2 2.2 4.8-4.9" />
        </svg>
      );
    case 'symptom':
      return (
        <svg viewBox="0 0 24 24" {...commonProps}>
          <path d="M12 21c-4.6-3.2-8-6-8-10.4A4.6 4.6 0 0 1 8.6 6c1.5 0 2.8.7 3.4 1.9A3.8 3.8 0 0 1 15.4 6 4.6 4.6 0 0 1 20 10.6C20 15 16.6 17.8 12 21Z" />
        </svg>
      );
    case 'break':
      return (
        <svg viewBox="0 0 24 24" {...commonProps}>
          <path d="m5 15 4-4 3 3 7-7" />
          <path d="M16 7h3v3" />
        </svg>
      );
    case 'continue':
      return (
        <svg viewBox="0 0 24 24" {...commonProps}>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 8v4" />
          <path d="M12 12h3" />
        </svg>
      );
    default:
      return null;
  }
}

function DashboardLoadingState() {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.82fr)_minmax(338px,1fr)]">
        <div className="space-y-6">
          <DashboardCard glow="blue" className="p-7 lg:p-8">
            <div className="space-y-4">
              <SkeletonBlock className="h-3.5 w-28" />
              <SkeletonBlock className="h-12 w-72 max-w-full rounded-[18px]" />
              <SkeletonBlock className="h-5 w-48 max-w-full" />
            </div>
          </DashboardCard>

          <DashboardCard className="p-7 lg:p-8">
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-3">
                  <SkeletonBlock className="h-8 w-52 rounded-[14px]" />
                  <SkeletonBlock className="h-4 w-72 max-w-full" />
                </div>
                <SkeletonBlock className="h-4 w-16" />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="rounded-[16px] bg-[#1A2542] px-5 py-[1.125rem]"
                  >
                    <SkeletonBlock className="h-3.5 w-24" />
                    <SkeletonBlock className="mt-5 h-8 w-28 rounded-[12px]" />
                    <SkeletonBlock className="mt-3 h-4 w-40 max-w-full" />
                  </div>
                ))}
              </div>
            </div>
          </DashboardCard>

          <div className="space-y-4">
            <SkeletonBlock className="h-3.5 w-28" />
            <div className="flex flex-wrap gap-3">
              <SkeletonBlock className="h-14 w-52 rounded-[16px]" />
              <SkeletonBlock className="h-14 w-44 rounded-[16px]" />
              <SkeletonBlock className="h-14 w-40 rounded-[16px]" />
            </div>
          </div>
        </div>

        <div className="space-y-5">
          {Array.from({ length: 3 }).map((_, index) => (
            <DashboardCard key={index} className="p-6">
              <div className="space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-3">
                    <SkeletonBlock className="h-8 w-44 rounded-[14px]" />
                    <SkeletonBlock className="h-4 w-40" />
                  </div>
                  <SkeletonBlock className="h-9 w-16 rounded-full" />
                </div>
                <SkeletonBlock className="h-3 w-full rounded-full" />
                <SkeletonBlock className="h-20 w-full rounded-[16px]" />
                <SkeletonBlock className="h-14 w-full rounded-[16px]" />
              </div>
            </DashboardCard>
          ))}
        </div>
      </div>
    </div>
  );
}
