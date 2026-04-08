import { Link } from 'react-router-dom';
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { PageHeader } from '@/components/common/page-header';
import { calculateSessionQuality } from '@/core/history/history-selectors';
import { useDashboardData } from '@/hooks/useDashboardData';
import type { MonitoringSession } from '@/types/domain';

export function DashboardPage() {
  const dashboard = useDashboardData();
  const hasTrendData = dashboard.trendPoints.some((point) => point.monitoringMinutes > 0);
  const hasDistributionData = dashboard.postureDistribution.some((entry) => entry.value > 0);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Milestone 7"
        title="Your local posture dashboard is now live"
        description="This view turns the saved session summaries, daily rollups, and reminder events into privacy-safe trends so the project can finally show progress over time instead of just live telemetry."
        actions={
          <div className="flex flex-wrap gap-3">
            <Link
              to="/live-monitor"
              className="inline-flex items-center rounded-full bg-accent-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-accent-300"
            >
              Open Live Monitor
            </Link>
            <Link
              to="/history"
              className="inline-flex items-center rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Open Full History
            </Link>
          </div>
        }
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="7-day monitoring"
            value={formatSecondsCompact(dashboard.summary.totalMonitoringSec)}
            detail={`${dashboard.summary.trackedDays} tracked days`}
          />
          <StatCard
            label="Posture quality"
            value={`${dashboard.summary.postureQualityPct}%`}
            detail="Good-posture share of sitting time"
          />
          <StatCard
            label="Breaks recorded"
            value={String(dashboard.summary.totalBreaks)}
            detail={`${dashboard.summary.remindersTriggered} reminders triggered`}
          />
          <StatCard
            label="Longest sitting bout"
            value={formatSecondsCompact(dashboard.summary.longestSittingBoutSec)}
            detail="Longest local stretch without a break"
          />
        </div>
      </PageHeader>

      <section className="grid gap-4 xl:grid-cols-[1.3fr_0.9fr]">
        <article className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-panel backdrop-blur">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent-300">
                Weekly trend
              </p>
              <h2 className="mt-2 font-display text-2xl text-white">Monitoring vs sitting</h2>
            </div>
            {dashboard.isLoading ? <p className="text-sm text-slate-400">Loading local data...</p> : null}
          </div>

          {hasTrendData ? (
            <div className="mt-6 h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dashboard.trendPoints}>
                  <defs>
                    <linearGradient id="monitoringFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#67e8f9" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="#67e8f9" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="sittingFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(148, 163, 184, 0.12)" vertical={false} />
                  <XAxis dataKey="label" stroke="#94a3b8" tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} width={40} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(2, 6, 23, 0.92)',
                      border: '1px solid rgba(148, 163, 184, 0.18)',
                      borderRadius: '18px',
                      color: '#e2e8f0',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="monitoringMinutes"
                    stroke="#67e8f9"
                    strokeWidth={2}
                    fill="url(#monitoringFill)"
                    name="Monitoring (min)"
                  />
                  <Area
                    type="monotone"
                    dataKey="sittingMinutes"
                    stroke="#38bdf8"
                    strokeWidth={2}
                    fill="url(#sittingFill)"
                    name="Sitting (min)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState>
              Finalize at least one monitoring session and the weekly trend will start charting your local minutes here.
            </EmptyState>
          )}
        </article>

        <article className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-panel">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent-300">
            Posture mix
          </p>
          <h2 className="mt-2 font-display text-2xl text-white">How your sitting time is distributed</h2>

          {hasDistributionData ? (
            <div className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dashboard.postureDistribution}
                      dataKey="value"
                      nameKey="label"
                      innerRadius={64}
                      outerRadius={88}
                      paddingAngle={4}
                    >
                      {dashboard.postureDistribution.map((entry) => (
                        <Cell key={entry.label} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(2, 6, 23, 0.92)',
                        border: '1px solid rgba(148, 163, 184, 0.18)',
                        borderRadius: '18px',
                        color: '#e2e8f0',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-3">
                {dashboard.postureDistribution.map((entry) => (
                  <div key={entry.label} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: entry.color }}
                          aria-hidden="true"
                        />
                        <span className="font-semibold text-white">{entry.label}</span>
                      </div>
                      <span>{formatSecondsCompact(entry.value)}</span>
                    </div>
                    <p className="mt-2 text-xs uppercase tracking-[0.2em] text-slate-400">
                      {entry.minutes.toFixed(1)} minutes stored locally
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState>
              Posture distribution appears after the first daily rollup includes sitting time.
            </EmptyState>
          )}
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <article className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-panel backdrop-blur">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent-300">
                Recent sessions
              </p>
              <h2 className="mt-2 font-display text-2xl text-white">Saved session snapshots</h2>
            </div>
            {dashboard.latestCompletedSession ? (
              <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-right text-sm text-slate-300">
                <p className="text-xs uppercase tracking-[0.22em] text-accent-300">Latest complete</p>
                <p className="mt-2 font-semibold text-white">
                  {formatShortDateTime(dashboard.latestCompletedSession.endedAt ?? dashboard.latestCompletedSession.startedAt)}
                </p>
              </div>
            ) : null}
          </div>

          {dashboard.recentSessions.length > 0 ? (
            <div className="mt-6 space-y-3">
              {dashboard.recentSessions.map((session) => (
                <SessionSummaryCard key={session.id} session={session} />
              ))}
            </div>
          ) : (
            <EmptyState>
              No completed sessions are saved yet. Start the live monitor, let it run for a bit, and stop the camera to create your first history entry.
            </EmptyState>
          )}
        </article>

        <article className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-panel">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent-300">
            Recent activity
          </p>
          <h2 className="mt-2 font-display text-2xl text-white">Latest stored events</h2>

          {dashboard.eventFeed.length > 0 ? (
            <div className="mt-6 space-y-3">
              {dashboard.eventFeed.map((event) => (
                <EventRow
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
              Event history will populate here after posture transitions, breaks, and reminder nudges are saved.
            </EmptyState>
          )}
        </article>
      </section>
    </div>
  );
}

type StatCardProps = {
  label: string;
  value: string;
  detail: string;
};

function StatCard({ label, value, detail }: StatCardProps) {
  return (
    <article className="rounded-2xl border border-white/10 bg-slate-950/45 p-5 text-sm text-slate-300">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent-300">{label}</p>
      <p className="mt-3 font-display text-3xl text-white">{value}</p>
      <p className="mt-2 leading-6 text-slate-400">{detail}</p>
    </article>
  );
}

type SessionSummaryCardProps = {
  session: MonitoringSession;
};

function SessionSummaryCard({ session }: SessionSummaryCardProps) {
  return (
    <article className="rounded-2xl border border-white/10 bg-slate-950/55 p-5 text-sm text-slate-300">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent-300">
            {formatShortDateTime(session.startedAt)}
          </p>
          <h3 className="mt-2 font-semibold text-white">{formatSecondsCompact(session.totalDurationSec)} session</h3>
        </div>
        <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200">
          {calculateSessionQuality(session)}% quality
        </div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <MiniMetric label="Sitting" value={formatSecondsCompact(session.sittingSec)} />
        <MiniMetric label="Good posture" value={formatSecondsCompact(session.goodPostureSec)} />
        <MiniMetric label="Breaks" value={String(session.breakCount)} />
        <MiniMetric label="Longest bout" value={formatSecondsCompact(session.longestSittingBoutSec)} />
      </div>
    </article>
  );
}

type MiniMetricProps = {
  label: string;
  value: string;
};

function MiniMetric({ label, value }: MiniMetricProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-2 font-semibold text-white">{value}</p>
    </div>
  );
}

type EventRowProps = {
  label: string;
  detail: string;
  timestamp: number;
  tone: 'neutral' | 'good' | 'warning';
};

function EventRow({ label, detail, timestamp, tone }: EventRowProps) {
  const toneClassName = {
    neutral: 'border-white/10 bg-white/5 text-slate-300',
    good: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-100',
    warning: 'border-amber-400/25 bg-amber-400/10 text-amber-100',
  }[tone];

  return (
    <article className={`rounded-2xl border p-4 ${toneClassName}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-white">{label}</h3>
          <p className="mt-1 text-sm leading-6 text-current/85">{detail}</p>
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-current/75">
          {formatShortDateTime(timestamp)}
        </p>
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
