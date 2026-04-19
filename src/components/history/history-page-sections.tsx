import { useState, type ReactNode } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CustomSelect } from '@/components/common/custom-select';
import type {
  CombinedDailyOverview,
  CombinedHistoryDateRange,
  DailyPostureStateSummary,
} from '@/core/history/combined-daily-view';
import type {
  DashboardSummary,
  EventFeedItem,
  PostureDistributionDatum,
  TrendPoint,
} from '@/core/history/history-selectors';
import {
  calculateSessionQuality,
  getSessionQualityLabel,
} from '@/core/history/history-selectors';
import type {
  CombinedHistoryFilterState,
} from '@/core/history/history-filter-persistence';
import type {
  SymptomSummary,
  SymptomSummaryStat,
  SymptomTrendPoint,
} from '@/core/symptoms/symptom-history';
import type { MonitoringSession } from '@/types/domain';

export function HistoryHero() {
  return (
    <section className="motion-card-reveal rounded-[1.6rem] border border-white/10 bg-[linear-gradient(180deg,rgba(20,29,49,0.96)_0%,rgba(15,23,42,0.92)_100%)] px-5 py-5 shadow-[0_24px_70px_-42px_rgba(4,9,23,0.95)] md:px-6">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent-300">
            History
          </p>
          <div className="space-y-2">
            <h1 className="font-display text-[2rem] tracking-[-0.035em] text-white md:text-[2.25rem]">
              Review what happened over time
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-slate-300">
              Browse a local-only review of posture, symptoms, sessions, and reminders by day.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <MetaPill label="Local only" />
          <MetaPill label="Descriptive review" />
          <MetaPill label="Filtered by day" />
        </div>
      </div>
    </section>
  );
}

export function HistorySummaryStrip({
  sessionSummary,
  summary,
}: {
  sessionSummary: {
    completedCount: number;
    averageSessionDurationSec: number;
    totalBreaks: number;
  };
  summary: DashboardSummary;
}) {
  return (
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <CompactSummaryCard
        label="Completed sessions"
        value={String(sessionSummary.completedCount)}
        detail="Saved session count"
      />
      <CompactSummaryCard
        label="Average session"
        value={formatSecondsCompact(sessionSummary.averageSessionDurationSec)}
        detail="Typical finished run"
      />
      <CompactSummaryCard
        label="Tracked monitoring"
        value={formatSecondsCompact(summary.totalMonitoringSec)}
        detail={`${summary.trackedDays} tracked days`}
      />
      <CompactSummaryCard
        label="Reminder count"
        value={String(summary.remindersTriggered)}
        detail={`${sessionSummary.totalBreaks} breaks recorded`}
      />
    </section>
  );
}

export function HistoryFilterBar({
  filters,
  dateRangeOptions,
  symptomOptions,
  postureOptions,
  hasActiveFilters,
  onChange,
  onReset,
}: {
  filters: CombinedHistoryFilterState;
  dateRangeOptions: Array<{ id: CombinedHistoryDateRange; label: string }>;
  symptomOptions: string[];
  postureOptions: DailyPostureStateSummary['label'][];
  hasActiveFilters: boolean;
  onChange: (filters: CombinedHistoryFilterState) => void;
  onReset: () => void;
}) {
  return (
    <section className="rounded-[1.45rem] border border-white/10 bg-slate-950/58 p-5 shadow-[0_20px_50px_-34px_rgba(4,9,23,0.94)]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent-300">
            Review controls
          </p>
          <h2 className="mt-2 text-[1.15rem] font-semibold text-white">
            Filter the daily timeline
          </h2>
        </div>
        {hasActiveFilters ? (
          <button
            type="button"
            className="rounded-full border border-white/10 bg-transparent px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white transition-all duration-200 ease-out hover:bg-white/10 focus:outline-none focus:ring-1 focus:ring-blue-400/40"
            onClick={onReset}
          >
            Clear filters
          </button>
        ) : null}
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1.2fr_0.9fr_0.9fr_auto]">
        <FilterControl label="Date range">
          <div className="flex flex-wrap gap-2">
            {dateRangeOptions.map((option) => (
              <ChipButton
                key={option.id}
                active={filters.dateRange === option.id}
                label={option.label}
                onClick={() => {
                  onChange({ ...filters, dateRange: option.id });
                }}
              />
            ))}
          </div>
        </FilterControl>

        <FilterControl label="Symptom">
          <CustomSelect
            value={filters.symptomLabel ?? ''}
            options={[
              { label: 'All symptoms', value: '' },
              ...symptomOptions.map((option) => ({ label: option, value: option })),
            ]}
            onChange={(nextValue) => {
              onChange({
                ...filters,
                symptomLabel: nextValue || null,
              });
            }}
            placeholder="All symptoms"
          />
        </FilterControl>

        <FilterControl label="Posture state">
          <CustomSelect
            value={filters.postureStateLabel ?? ''}
            options={[
              { label: 'All states', value: '' },
              ...postureOptions.map((option) => ({ label: option, value: option })),
            ]}
            onChange={(nextValue) => {
              onChange({
                ...filters,
                postureStateLabel:
                  (nextValue as DailyPostureStateSummary['label']) || null,
              });
            }}
            placeholder="All states"
          />
        </FilterControl>

        <FilterControl label="Symptom days only">
          <button
            type="button"
            role="switch"
            aria-checked={filters.onlyDaysWithSymptoms}
            className={[
              'h-11 w-full rounded-xl border px-4 text-sm font-semibold transition-all duration-200 ease-out focus:outline-none focus:ring-1 focus:ring-blue-400/40',
              filters.onlyDaysWithSymptoms
                ? 'border-blue-400/30 bg-blue-500/20 text-blue-300'
                : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white',
            ].join(' ')}
            onClick={() => {
              onChange({
                ...filters,
                onlyDaysWithSymptoms: !filters.onlyDaysWithSymptoms,
              });
            }}
          >
            {filters.onlyDaysWithSymptoms ? 'On' : 'Off'}
          </button>
        </FilterControl>
      </div>
    </section>
  );
}

export function DailyTimelineSection({
  combinedDailyOverviews,
  isLoading,
}: {
  combinedDailyOverviews: CombinedDailyOverview[];
  isLoading: boolean;
}) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent-300">
            Daily timeline
          </p>
          <h2 className="mt-2 text-[1.35rem] font-semibold text-white">
            {combinedDailyOverviews.length} matched day{combinedDailyOverviews.length === 1 ? '' : 's'}
          </h2>
        </div>
        <p className="max-w-xl text-sm leading-6 text-slate-400">
          Each card keeps one local day together so posture and symptom context are easier to review side by side.
        </p>
      </div>

      {isLoading ? (
        <HistoryEmptyState>
          Loading local daily history...
        </HistoryEmptyState>
      ) : combinedDailyOverviews.length > 0 ? (
        <div className="space-y-4">
          {combinedDailyOverviews.map((overview) => (
            <DailyTimelineCard key={overview.dateKey} overview={overview} />
          ))}
        </div>
      ) : (
        <HistoryEmptyState>
          No recorded days match the current filters yet. Try a broader range or clear one of the active filters.
        </HistoryEmptyState>
      )}
    </section>
  );
}

export function HistoryInsightsTabs({
  eventFeed,
  isLoading,
  postureDistribution,
  recentSessions,
  symptomSummary,
  symptomTrendPoints,
  trendPoints,
}: {
  eventFeed: EventFeedItem[];
  isLoading: boolean;
  postureDistribution: PostureDistributionDatum[];
  recentSessions: MonitoringSession[];
  symptomSummary: SymptomSummary;
  symptomTrendPoints: SymptomTrendPoint[];
  trendPoints: TrendPoint[];
}) {
  const [activeTab, setActiveTab] = useState<'trends' | 'sessions' | 'events'>(
    'trends',
  );

  return (
    <section className="rounded-[1.55rem] border border-white/10 bg-white/[0.04] p-5 shadow-[0_20px_50px_-34px_rgba(4,9,23,0.92)]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent-300">
            Deeper insights
          </p>
          <h2 className="mt-2 text-[1.25rem] font-semibold text-white">
            Explore trends, sessions, and events
          </h2>
        </div>
        <div className="inline-flex rounded-full border border-white/10 bg-slate-950/70 p-1">
          {([
            ['trends', 'Trends'],
            ['sessions', 'Sessions'],
            ['events', 'Events'],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={[
                'rounded-full px-4 py-2 text-sm font-semibold transition',
                activeTab === id
                  ? 'bg-accent-300 text-slate-950'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white',
              ].join(' ')}
              onClick={() => {
                setActiveTab(id);
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5">
        {activeTab === 'trends' ? (
          <TrendsTabPanel
            isLoading={isLoading}
            postureDistribution={postureDistribution}
            symptomSummary={symptomSummary}
            symptomTrendPoints={symptomTrendPoints}
            trendPoints={trendPoints}
          />
        ) : null}
        {activeTab === 'sessions' ? (
          <SessionsTabPanel recentSessions={recentSessions} />
        ) : null}
        {activeTab === 'events' ? (
          <EventsTabPanel eventFeed={eventFeed} />
        ) : null}
      </div>
    </section>
  );
}

function TrendsTabPanel({
  isLoading,
  postureDistribution,
  symptomSummary,
  symptomTrendPoints,
  trendPoints,
}: {
  isLoading: boolean;
  postureDistribution: PostureDistributionDatum[];
  symptomSummary: SymptomSummary;
  symptomTrendPoints: SymptomTrendPoint[];
  trendPoints: TrendPoint[];
}) {
  const hasTrendData = trendPoints.some((point) => point.monitoringMinutes > 0);
  const hasDistributionData = postureDistribution.some((entry) => entry.value > 0);
  const hasSymptomTrendData = symptomTrendPoints.some(
    (point) => point.checkInCount > 0,
  );

  return (
    <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
      <ChartCard
        detail={isLoading ? 'Loading local history...' : undefined}
        label="14-day quality trend"
        title="Daily posture quality and reminders"
      >
        {hasTrendData ? (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendPoints}>
                <CartesianGrid stroke="rgba(148, 163, 184, 0.12)" vertical={false} />
                <XAxis dataKey="label" stroke="#94a3b8" tickLine={false} axisLine={false} />
                <YAxis yAxisId="left" stroke="#94a3b8" tickLine={false} axisLine={false} width={40} />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#64748b"
                  tickLine={false}
                  axisLine={false}
                  width={32}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="postureQualityPct"
                  stroke="#34d399"
                  strokeWidth={3}
                  dot={{ r: 3 }}
                  name="Quality (%)"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="reminders"
                  stroke="#fbbf24"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  name="Reminders"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <HistoryEmptyState>
            Finish a few monitoring sessions and this chart will start plotting local daily quality and reminder patterns.
          </HistoryEmptyState>
        )}
      </ChartCard>

      <ChartCard label="Posture breakdown" title="Stored sitting-state totals" dark>
        {hasDistributionData ? (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={postureDistribution} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid stroke="rgba(148, 163, 184, 0.12)" horizontal={false} />
                <XAxis type="number" stroke="#94a3b8" tickLine={false} axisLine={false} />
                <YAxis
                  type="category"
                  dataKey="label"
                  stroke="#94a3b8"
                  tickLine={false}
                  axisLine={false}
                  width={100}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="minutes" radius={[0, 14, 14, 0]} name="Minutes">
                  {postureDistribution.map((entry) => (
                    <Cell key={entry.label} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <HistoryEmptyState>
            Stored posture totals appear here once local daily posture rollups are available.
          </HistoryEmptyState>
        )}
      </ChartCard>

      <ChartCard
        label="30-day symptom history"
        title="Recent symptom activity and severity"
      >
        {hasSymptomTrendData ? (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={symptomTrendPoints}>
                <CartesianGrid stroke="rgba(148, 163, 184, 0.12)" vertical={false} />
                <XAxis dataKey="label" stroke="#94a3b8" tickLine={false} axisLine={false} />
                <YAxis yAxisId="left" stroke="#94a3b8" tickLine={false} axisLine={false} width={36} />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[0, 5]}
                  stroke="#64748b"
                  tickLine={false}
                  axisLine={false}
                  width={32}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="checkInCount"
                  stroke="#67e8f9"
                  strokeWidth={3}
                  dot={{ r: 3 }}
                  name="Check-ins"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="averageSeverity"
                  stroke="#fbbf24"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  name="Average severity"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <HistoryEmptyState>
            Start saving symptom check-ins and this section will chart recent check-in frequency and average severity by day.
          </HistoryEmptyState>
        )}
      </ChartCard>

      <ChartCard label="Symptom summary" title="Most common local patterns" dark>
        <div className="grid gap-3 sm:grid-cols-2">
          <CompactSummaryCard
            label="Check-ins"
            value={String(symptomSummary.checkInCount)}
            detail={`${symptomSummary.symptomFrequency} symptom selections`}
          />
          <CompactSummaryCard
            label="Average severity"
            value={`${symptomSummary.averageSeverity.toFixed(1)} / 5`}
            detail="Recorded severity only"
          />
          <CompactSummaryCard
            label="Work interference"
            value={String(symptomSummary.workInterferenceCount)}
            detail="Check-ins that affected work"
          />
          <CompactSummaryCard
            label="Last reported"
            value={
              symptomSummary.lastReportedAt
                ? formatShortDate(symptomSummary.lastReportedAt)
                : 'None'
            }
            detail="Most recent symptom check-in"
          />
        </div>

        {symptomSummary.mostCommonSymptoms.length > 0 ? (
          <div className="mt-4 space-y-3">
            {symptomSummary.mostCommonSymptoms.map((symptom) => (
              <SymptomSummaryRow key={symptom.label} symptom={symptom} />
            ))}
          </div>
        ) : (
          <HistoryEmptyState>
            No symptom summaries are available yet because the local symptom history is still empty.
          </HistoryEmptyState>
        )}
      </ChartCard>
    </div>
  );
}

function SessionsTabPanel({
  recentSessions,
}: {
  recentSessions: MonitoringSession[];
}) {
  return (
    <div className="rounded-[1.35rem] border border-white/10 bg-slate-950/58 p-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent-300">
          Completed sessions
        </p>
        <h3 className="mt-2 text-[1.2rem] font-semibold text-white">
          Session log
        </h3>
      </div>

      {recentSessions.length > 0 ? (
        <div className="mt-5 overflow-hidden rounded-2xl border border-white/10">
          <div className="overflow-x-auto">
            <div className="min-w-[40rem]">
              <div className="grid grid-cols-[1.2fr_0.9fr_0.9fr_0.8fr_0.9fr] gap-3 bg-slate-950/70 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                <span>Started</span>
                <span>Duration</span>
                <span>Sitting</span>
                <span>Breaks</span>
                <span>Quality</span>
              </div>
              <div className="divide-y divide-white/10 bg-slate-950/35">
                {recentSessions.map((session) => (
                  <SessionRow key={session.id} session={session} />
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <HistoryEmptyState>
          No completed sessions are stored yet. The first finalized live-monitor run will show up here.
        </HistoryEmptyState>
      )}
    </div>
  );
}

function EventsTabPanel({ eventFeed }: { eventFeed: EventFeedItem[] }) {
  return (
    <div className="rounded-[1.35rem] border border-white/10 bg-slate-950/58 p-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent-300">
          Recent posture and reminder events
        </p>
        <h3 className="mt-2 text-[1.2rem] font-semibold text-white">
          Event timeline
        </h3>
      </div>

      {eventFeed.length > 0 ? (
        <div className="mt-5 space-y-3">
          {eventFeed.map((event) => (
            <TimelineRow
              key={event.id}
              label={event.label}
              detail={event.detail}
              timestamp={event.timestamp}
              tone={event.tone}
            />
          ))}
        </div>
      ) : (
        <HistoryEmptyState>
          The event timeline fills in after the posture state machine and reminder engine emit local events.
        </HistoryEmptyState>
      )}
    </div>
  );
}

function DailyTimelineCard({ overview }: { overview: CombinedDailyOverview }) {
  const qualityTone =
    overview.postureQualityPct >= 70
      ? 'good'
      : overview.postureQualityPct >= 40
        ? 'warning'
        : 'neutral';

  return (
    <article className="rounded-[1.5rem] border border-white/10 bg-[linear-gradient(180deg,rgba(20,29,49,0.88)_0%,rgba(15,23,42,0.82)_100%)] p-5 shadow-[0_22px_60px_-38px_rgba(4,9,23,0.95)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent-300">
            Daily overview
          </p>
          <h3 className="mt-2 text-[1.25rem] font-semibold text-white">
            {overview.label}
          </h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusPill
            label={overview.hasPostureData ? 'Posture recorded' : 'No posture'}
            tone={overview.hasPostureData ? 'good' : 'neutral'}
          />
          <StatusPill
            label={
              overview.hasSymptomData
                ? `${overview.symptomCheckInCount} symptom check-in${overview.symptomCheckInCount === 1 ? '' : 's'}`
                : 'No symptom check-in'
            }
            tone={overview.hasSymptomData ? 'warning' : 'neutral'}
          />
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MiniMetric
              label="Monitoring"
              value={formatSecondsCompact(overview.monitoringSec)}
            />
            <MiniMetric
              label="Quality"
              value={`${overview.postureQualityPct}%`}
            />
            <MiniMetric
              label="Key posture"
              value={overview.dominantPostureLabel ?? 'None'}
            />
            <MiniMetric
              label="Breaks / reminders"
              value={`${overview.totalBreaks} / ${overview.remindersTriggered}`}
            />
          </div>

          <div className="rounded-[1.15rem] border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill label={`Quality ${overview.postureQualityPct}%`} tone={qualityTone} />
              {overview.postureStates
                .filter((entry) => entry.seconds > 0)
                .slice(0, 3)
                .map((entry) => (
                  <span
                    key={`${overview.dateKey}-${entry.label}`}
                    className="rounded-full border border-white/10 bg-slate-900/72 px-3 py-1.5 text-xs font-medium text-slate-200"
                  >
                    {entry.label}: {entry.minutes.toFixed(1)} min
                  </span>
                ))}
            </div>
            <p className="mt-3 leading-6 text-slate-400">
              {overview.hasPostureData
                ? `${formatSecondsCompact(overview.sittingSec)} of sitting was tracked on this day.`
                : 'No daily posture rollup was recorded on this day.'}
            </p>
          </div>
        </div>

        <div className="rounded-[1.2rem] border border-white/10 bg-slate-950/72 p-4 text-sm text-slate-300">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-300">
            Symptoms reported that day
          </p>
          {overview.hasSymptomData ? (
            <>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <MiniMetric label="Symptom count" value={String(overview.symptomFrequency)} />
                <MiniMetric
                  label="Average severity"
                  value={`${overview.averageSymptomSeverity.toFixed(1)} / 5`}
                />
                <MiniMetric
                  label="Work impact"
                  value={overview.workInterferenceReported ? 'Reported' : 'No'}
                />
              </div>
              <p className="mt-4 leading-6 text-slate-400">
                {overview.workInterferenceReported
                  ? 'At least one check-in said symptoms affected normal work on this day.'
                  : 'No saved check-in reported work interference on this day.'}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {overview.symptomsReported.map((label) => (
                  <span
                    key={`${overview.dateKey}-${label}`}
                    className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-medium text-slate-200"
                  >
                    {label}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <p className="mt-4 leading-6 text-slate-400">
              No symptom check-in was recorded on this day.
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

function CompactSummaryCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="rounded-[1.2rem] border border-white/10 bg-slate-950/50 px-4 py-4 shadow-[0_18px_36px_-28px_rgba(4,9,23,0.9)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent-300">
        {label}
      </p>
      <p className="mt-2 text-[1.4rem] font-semibold text-white">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-400">{detail}</p>
    </article>
  );
}

function ChartCard({
  children,
  dark = false,
  detail,
  label,
  title,
}: {
  children: ReactNode;
  dark?: boolean;
  detail?: string;
  label: string;
  title: string;
}) {
  return (
    <article
      className={[
        'rounded-[1.35rem] border border-white/10 p-5 shadow-panel',
        dark ? 'bg-slate-950/72' : 'bg-white/[0.05] backdrop-blur',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent-300">
            {label}
          </p>
          <h3 className="mt-2 text-[1.2rem] font-semibold text-white">{title}</h3>
        </div>
        {detail ? <p className="text-sm text-slate-400">{detail}</p> : null}
      </div>
      <div className="mt-5">{children}</div>
    </article>
  );
}

function FilterControl({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-[180px] space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400/90">
        {label}
      </p>
      {children}
    </div>
  );
}

function ChipButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={[
        'rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-medium backdrop-blur transition-all duration-200 ease-out focus:outline-none focus:ring-1 focus:ring-blue-400/40',
        active
          ? 'bg-blue-500/20 text-blue-300'
          : 'text-slate-300 hover:bg-white/10 hover:text-white',
      ].join(' ')}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1rem] border border-white/10 bg-white/[0.04] p-3">
      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: 'neutral' | 'good' | 'warning';
}) {
  const className = {
    neutral: 'border-white/10 bg-white/[0.04] text-slate-300',
    good: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-100',
    warning: 'border-amber-400/25 bg-amber-400/10 text-amber-100',
  }[tone];

  return (
    <span
      className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] ${className}`}
    >
      {label}
    </span>
  );
}

function SessionRow({ session }: { session: MonitoringSession }) {
  return (
    <div className="grid min-w-[40rem] grid-cols-[1.2fr_0.9fr_0.9fr_0.8fr_0.9fr] gap-3 px-4 py-4 text-sm text-slate-300">
      <span className="font-medium text-white">
        {formatShortDateTime(session.startedAt)}
        {session.insights?.[0] ? (
          <span className="mt-1 block text-xs leading-5 text-slate-400">
            {session.insights[0]}
          </span>
        ) : null}
      </span>
      <span>{formatSecondsCompact(session.totalDurationSec)}</span>
      <span>{formatSecondsCompact(session.sittingSec)}</span>
      <span>{session.breakCount}</span>
      <span>
        {getSessionQualityLabel(session)}
        <span className="mt-1 block text-xs text-slate-500">
          {calculateSessionQuality(session)}%
        </span>
      </span>
    </div>
  );
}

function TimelineRow({
  label,
  detail,
  timestamp,
  tone,
}: {
  label: string;
  detail: string;
  timestamp: number;
  tone: 'neutral' | 'good' | 'warning';
}) {
  const markerClassName = {
    neutral: 'bg-slate-300',
    good: 'bg-emerald-300',
    warning: 'bg-amber-300',
  }[tone];

  return (
    <article className="rounded-[1.15rem] border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">
      <div className="flex items-start gap-4">
        <span className={`mt-2 h-3 w-3 shrink-0 rounded-full ${markerClassName}`} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h3 className="font-semibold text-white">{label}</h3>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              {formatShortDateTime(timestamp)}
            </p>
          </div>
          <p className="mt-2 leading-6 text-slate-400">{detail}</p>
        </div>
      </div>
    </article>
  );
}

function SymptomSummaryRow({ symptom }: { symptom: SymptomSummaryStat }) {
  return (
    <article className="rounded-[1.15rem] border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-white">{symptom.label}</p>
          <p className="mt-2 text-slate-400">
            Average severity {symptom.averageSeverity.toFixed(1)} / 5
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold text-white">{symptom.count}</p>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">reports</p>
        </div>
      </div>
      <p className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-400">
        Last reported {formatShortDateTime(symptom.lastReportedAt)}
      </p>
    </article>
  );
}

function MetaPill({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
      {label}
    </span>
  );
}

function HistoryEmptyState({ children }: { children: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.04] p-6 text-sm leading-6 text-slate-400">
      {children}
    </div>
  );
}

const tooltipStyle = {
  backgroundColor: 'rgba(2, 6, 23, 0.92)',
  border: '1px solid rgba(148, 163, 184, 0.18)',
  borderRadius: '18px',
  color: '#e2e8f0',
};

function formatShortDateTime(timestamp: number) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(timestamp);
}

function formatShortDate(timestamp: number) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(timestamp);
}

function formatSecondsCompact(totalSeconds: number) {
  if (totalSeconds <= 0) {
    return '0s';
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }

  return `${seconds}s`;
}
