import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { PageHeader } from '@/components/common/page-header';
import { calculateSessionQuality } from '@/core/history/history-selectors';
import { useHistoryData } from '@/hooks/useHistoryData';
import type { MonitoringSession } from '@/types/domain';

export function HistoryPage() {
  const history = useHistoryData();
  const hasTrendData = history.trendPoints.some((point) => point.monitoringMinutes > 0);
  const hasDistributionData = history.postureDistribution.some((entry) => entry.value > 0);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="History"
        title="Local trends and saved monitoring sessions"
        description="This page is the durable handoff-friendly record of what the app has stored so far: daily rollups, completed sessions, posture events, and reminder activity. No raw camera footage leaves the browser."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Completed sessions"
            value={String(history.sessionSummary.completedCount)}
            detail="Finalized sessions stored in IndexedDB"
          />
          <SummaryCard
            label="Average session"
            value={formatSecondsCompact(history.sessionSummary.averageSessionDurationSec)}
            detail="Average completed-session duration"
          />
          <SummaryCard
            label="Tracked monitoring"
            value={formatSecondsCompact(history.summary.totalMonitoringSec)}
            detail={`${history.summary.trackedDays} tracked days in recent rollups`}
          />
          <SummaryCard
            label="Reminder count"
            value={String(history.summary.remindersTriggered)}
            detail={`${history.sessionSummary.totalBreaks} breaks recorded across saved sessions`}
          />
        </div>
      </PageHeader>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <article className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-panel backdrop-blur">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent-300">
                14-day quality trend
              </p>
              <h2 className="mt-2 font-display text-2xl text-white">Daily posture quality and reminders</h2>
            </div>
            {history.isLoading ? <p className="text-sm text-slate-400">Loading local history...</p> : null}
          </div>

          {hasTrendData ? (
            <div className="mt-6 h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history.trendPoints}>
                  <CartesianGrid stroke="rgba(148, 163, 184, 0.12)" vertical={false} />
                  <XAxis dataKey="label" stroke="#94a3b8" tickLine={false} axisLine={false} />
                  <YAxis yAxisId="left" stroke="#94a3b8" tickLine={false} axisLine={false} width={40} />
                  <YAxis yAxisId="right" orientation="right" stroke="#64748b" tickLine={false} axisLine={false} width={32} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(2, 6, 23, 0.92)',
                      border: '1px solid rgba(148, 163, 184, 0.18)',
                      borderRadius: '18px',
                      color: '#e2e8f0',
                    }}
                  />
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
            <EmptyState>
              Finish a few monitoring sessions and this page will start plotting your local daily quality and reminder pattern.
            </EmptyState>
          )}
        </article>

        <article className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-panel">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent-300">
            Posture breakdown
          </p>
          <h2 className="mt-2 font-display text-2xl text-white">Stored sitting-state totals</h2>

          {hasDistributionData ? (
            <div className="mt-6 h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={history.postureDistribution} layout="vertical" margin={{ left: 24 }}>
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
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(2, 6, 23, 0.92)',
                      border: '1px solid rgba(148, 163, 184, 0.18)',
                      borderRadius: '18px',
                      color: '#e2e8f0',
                    }}
                  />
                  <Bar dataKey="minutes" radius={[0, 14, 14, 0]} name="Minutes">
                    {history.postureDistribution.map((entry) => (
                      <Cell key={entry.label} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState>
              Stored posture totals appear here once the app has daily rollups with sitting time.
            </EmptyState>
          )}
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <article className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-panel backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent-300">
            Session log
          </p>
          <h2 className="mt-2 font-display text-2xl text-white">Completed sessions</h2>

          {history.recentSessions.length > 0 ? (
            <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
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
                    {history.recentSessions.map((session) => (
                      <SessionRow key={session.id} session={session} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <EmptyState>
              No completed sessions are stored yet. The first finalized live-monitor run will show up here.
            </EmptyState>
          )}
        </article>

        <article className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-panel">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent-300">
            Event timeline
          </p>
          <h2 className="mt-2 font-display text-2xl text-white">Recent posture and reminder events</h2>

          {history.eventFeed.length > 0 ? (
            <div className="mt-6 space-y-3">
              {history.eventFeed.map((event) => (
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
            <EmptyState>
              The event timeline fills in after the posture state machine and reminder engine emit local events.
            </EmptyState>
          )}
        </article>
      </section>
    </div>
  );
}

type SummaryCardProps = {
  label: string;
  value: string;
  detail: string;
};

function SummaryCard({ label, value, detail }: SummaryCardProps) {
  return (
    <article className="rounded-2xl border border-white/10 bg-slate-950/45 p-5 text-sm text-slate-300">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent-300">{label}</p>
      <p className="mt-3 font-display text-3xl text-white">{value}</p>
      <p className="mt-2 leading-6 text-slate-400">{detail}</p>
    </article>
  );
}

type SessionRowProps = {
  session: MonitoringSession;
};

function SessionRow({ session }: SessionRowProps) {
  return (
    <div className="grid min-w-[40rem] grid-cols-[1.2fr_0.9fr_0.9fr_0.8fr_0.9fr] gap-3 px-4 py-4 text-sm text-slate-300">
      <span className="font-medium text-white">{formatShortDateTime(session.startedAt)}</span>
      <span>{formatSecondsCompact(session.totalDurationSec)}</span>
      <span>{formatSecondsCompact(session.sittingSec)}</span>
      <span>{session.breakCount}</span>
      <span>{calculateSessionQuality(session)}%</span>
    </div>
  );
}

type TimelineRowProps = {
  label: string;
  detail: string;
  timestamp: number;
  tone: 'neutral' | 'good' | 'warning';
};

function TimelineRow({ label, detail, timestamp, tone }: TimelineRowProps) {
  const markerClassName = {
    neutral: 'bg-slate-300',
    good: 'bg-emerald-300',
    warning: 'bg-amber-300',
  }[tone];

  return (
    <article className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
      <div className="flex items-start gap-4">
        <span className={`mt-2 h-3 w-3 shrink-0 rounded-full ${markerClassName}`} aria-hidden="true" />
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

type EmptyStateProps = {
  children: string;
};

function EmptyState({ children }: EmptyStateProps) {
  return (
    <div className="mt-6 rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-sm leading-6 text-slate-400">
      {children}
    </div>
  );
}

function formatShortDateTime(timestamp: number) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
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
