import { useEffect, useState, type ReactNode } from 'react';
import {
  combinedHistoryDateRangeOptions,
  filterCombinedDailyOverviews,
  getCombinedDailyPostureFilterOptions,
  getCombinedDailySymptomOptions,
  type CombinedDailyOverview,
} from '@/core/history/combined-daily-view';
import {
  areCombinedHistoryFiltersEqual,
  defaultCombinedHistoryFilters,
  persistCombinedHistoryFilters,
  readPersistedCombinedHistoryFilters,
  sanitizeCombinedHistoryFilters,
} from '@/core/history/history-filter-persistence';

type CombinedDailyHistorySectionProps = {
  combinedDailyOverviews: CombinedDailyOverview[];
  isLoading: boolean;
};

export function CombinedDailyHistorySection({
  combinedDailyOverviews,
  isLoading,
}: CombinedDailyHistorySectionProps) {
  const [filters, setFilters] = useState(readPersistedCombinedHistoryFilters);

  const symptomFilterOptions =
    getCombinedDailySymptomOptions(combinedDailyOverviews);
  const postureFilterOptions = getCombinedDailyPostureFilterOptions(
    combinedDailyOverviews,
  );
  const safeFilters = sanitizeCombinedHistoryFilters(
    filters,
    symptomFilterOptions,
    postureFilterOptions,
    {
      preserveOptionFilters: isLoading,
    },
  );
  const filteredCombinedDailyOverviews = filterCombinedDailyOverviews(
    combinedDailyOverviews,
    safeFilters,
  );
  const hasCombinedDailyData = combinedDailyOverviews.length > 0;
  const hasFilteredCombinedDailyData = filteredCombinedDailyOverviews.length > 0;
  const hasActiveFilters =
    !areCombinedHistoryFiltersEqual(
      safeFilters,
      defaultCombinedHistoryFilters,
    );

  useEffect(() => {
    const nextSafeFilters = sanitizeCombinedHistoryFilters(
      filters,
      symptomFilterOptions,
      postureFilterOptions,
      {
        preserveOptionFilters: isLoading,
      },
    );

    if (!areCombinedHistoryFiltersEqual(filters, nextSafeFilters)) {
      setFilters(nextSafeFilters);
      return;
    }

    persistCombinedHistoryFilters(nextSafeFilters);
  }, [filters, isLoading, postureFilterOptions, symptomFilterOptions]);

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-panel backdrop-blur">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent-300">
            Combined daily overview
          </p>
          <h2 className="mt-2 font-display text-2xl text-white">
            Posture and symptoms recorded by local day
          </h2>
        </div>
        <p className="max-w-xl text-sm leading-6 text-slate-400">
          This section stays descriptive only. It shows filtered daily history
          based on what was recorded on each local day without implying
          diagnosis, prediction, or causation.
        </p>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <article className="rounded-3xl border border-white/10 bg-slate-950/70 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent-300">
                Review controls
              </p>
              <h3 className="mt-2 font-display text-2xl text-white">
                Filter local daily history
              </h3>
            </div>
            {hasActiveFilters ? (
              <button
                type="button"
                className="rounded-full border border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-white/10"
                onClick={() => {
                  setFilters(defaultCombinedHistoryFilters);
                }}
              >
                Clear filters
              </button>
            ) : null}
          </div>

          <div className="mt-6 space-y-6">
            <FilterGroup
              label="Date range"
              detail="Use local calendar days only."
            >
              <div className="flex flex-wrap gap-3">
                {combinedHistoryDateRangeOptions.map((option) => (
                  <FilterChipButton
                    key={option.id}
                    label={option.label}
                    isSelected={safeFilters.dateRange === option.id}
                    onClick={() => {
                      setFilters((currentValue) => ({
                        ...currentValue,
                        dateRange: option.id,
                      }));
                    }}
                  />
                ))}
              </div>
            </FilterGroup>

            <FilterGroup
              label="Symptom filter"
              detail="Choose one recorded symptom at a time for this phase."
            >
              {symptomFilterOptions.length > 0 ? (
                <div className="flex flex-wrap gap-3">
                  <FilterChipButton
                    label="All symptoms"
                    isSelected={safeFilters.symptomLabel === null}
                    onClick={() => {
                      setFilters((currentValue) => ({
                        ...currentValue,
                        symptomLabel: null,
                      }));
                    }}
                  />
                  {symptomFilterOptions.map((label) => (
                    <FilterChipButton
                      key={label}
                      label={label}
                      isSelected={safeFilters.symptomLabel === label}
                      onClick={() => {
                        setFilters((currentValue) => ({
                          ...currentValue,
                          symptomLabel: label,
                        }));
                      }}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm leading-6 text-slate-400">
                  Symptom filters will appear after local symptom check-ins are
                  saved.
                </p>
              )}
            </FilterGroup>

            <FilterGroup
              label="Only days with symptoms"
              detail="Keep only days where at least one symptom check-in was recorded."
            >
              <button
                type="button"
                role="switch"
                aria-checked={safeFilters.onlyDaysWithSymptoms}
                aria-label="Only days with symptoms"
                className={[
                  'rounded-full border px-5 py-3 text-sm font-semibold transition',
                  safeFilters.onlyDaysWithSymptoms
                    ? 'border-accent-300 bg-accent-400/15 text-white'
                    : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white',
                ].join(' ')}
                onClick={() => {
                  setFilters((currentValue) => ({
                    ...currentValue,
                    onlyDaysWithSymptoms: !currentValue.onlyDaysWithSymptoms,
                  }));
                }}
              >
                {safeFilters.onlyDaysWithSymptoms
                  ? 'Showing symptom days only'
                  : 'Show all recorded days'}
              </button>
            </FilterGroup>

            <FilterGroup
              label="Posture-state filter"
              detail="This uses stored sitting-state rollups, so it intentionally focuses on Good posture, Mild slouch, and Deep slouch."
            >
              {postureFilterOptions.length > 0 ? (
                <div className="flex flex-wrap gap-3">
                  <FilterChipButton
                    label="All posture states"
                    isSelected={safeFilters.postureStateLabel === null}
                    onClick={() => {
                      setFilters((currentValue) => ({
                        ...currentValue,
                        postureStateLabel: null,
                      }));
                    }}
                  />
                  {postureFilterOptions.map((label) => (
                    <FilterChipButton
                      key={label}
                      label={label}
                      isSelected={safeFilters.postureStateLabel === label}
                      onClick={() => {
                        setFilters((currentValue) => ({
                          ...currentValue,
                          postureStateLabel: label,
                        }));
                      }}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm leading-6 text-slate-400">
                  Posture-state filters will appear after local daily posture
                  rollups are available.
                </p>
              )}
            </FilterGroup>
          </div>
        </article>

        <div className="space-y-4">
          <article className="rounded-3xl border border-white/10 bg-slate-950/70 p-5 text-sm text-slate-300">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent-300">
                  Filtered daily history
                </p>
                <h3 className="mt-2 font-display text-2xl text-white">
                  {filteredCombinedDailyOverviews.length} days matching filters
                </h3>
              </div>
              <p className="max-w-sm leading-6 text-slate-400">
                {combinedDailyOverviews.length} total recorded days in local
                history.
              </p>
            </div>
          </article>

          {hasCombinedDailyData ? (
            hasFilteredCombinedDailyData ? (
              <div
                className="space-y-4"
                role="list"
                aria-label="Filtered daily history"
              >
                {filteredCombinedDailyOverviews.map((overview) => (
                  <CombinedDailyCard
                    key={overview.dateKey}
                    overview={overview}
                  />
                ))}
              </div>
            ) : (
              <EmptyState>
                No recorded days match these filters yet. Try a broader date
                range or clear one of the active symptom or posture filters.
              </EmptyState>
            )
          ) : (
            <EmptyState>
              As local monitoring sessions and symptom check-ins build up, this
              section will align them into a daily overview for each recorded
              day.
            </EmptyState>
          )}
        </div>
      </div>
    </section>
  );
}

type FilterGroupProps = {
  label: string;
  detail: string;
  children: ReactNode;
};

function FilterGroup({ label, detail, children }: FilterGroupProps) {
  return (
    <section className="space-y-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-300">
          {label}
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-400">{detail}</p>
      </div>
      {children}
    </section>
  );
}

type FilterChipButtonProps = {
  label: string;
  isSelected: boolean;
  onClick: () => void;
};

function FilterChipButton({
  label,
  isSelected,
  onClick,
}: FilterChipButtonProps) {
  return (
    <button
      type="button"
      className={[
        'rounded-full border px-4 py-3 text-sm font-medium transition',
        isSelected
          ? 'border-accent-300 bg-accent-400/15 text-white'
          : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white',
      ].join(' ')}
      aria-pressed={isSelected}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

type CombinedDailyCardProps = {
  overview: CombinedDailyOverview;
};

function CombinedDailyCard({ overview }: CombinedDailyCardProps) {
  return (
    <article
      className="rounded-3xl border border-white/10 bg-slate-950/60 p-5"
      role="listitem"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent-300">
            Daily overview
          </p>
          <h3 className="mt-2 font-display text-2xl text-white">
            {overview.label}
          </h3>
        </div>
        <div className="flex flex-wrap gap-3">
          <DayFlag
            label={
              overview.hasPostureData ? 'Posture recorded' : 'No posture rollup'
            }
            tone={overview.hasPostureData ? 'good' : 'neutral'}
          />
          <DayFlag
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
        <section className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-300">
            Posture recorded that day
          </p>
          {overview.hasPostureData ? (
            <>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <MiniDayMetric
                  label="Monitoring"
                  value={formatSecondsCompact(overview.monitoringSec)}
                />
                <MiniDayMetric
                  label="Sitting"
                  value={formatSecondsCompact(overview.sittingSec)}
                />
                <MiniDayMetric
                  label="Breaks"
                  value={String(overview.totalBreaks)}
                />
                <MiniDayMetric
                  label="Reminders"
                  value={String(overview.remindersTriggered)}
                />
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-400">
                <span className="rounded-full border border-white/10 bg-slate-900/70 px-3 py-2 text-slate-200">
                  Quality {overview.postureQualityPct}%
                </span>
                <span className="rounded-full border border-white/10 bg-slate-900/70 px-3 py-2 text-slate-200">
                  Key posture state:{' '}
                  {overview.dominantPostureLabel ?? 'No sitting posture data'}
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {overview.postureStates
                  .filter((entry) => entry.seconds > 0)
                  .map((entry) => (
                    <span
                      key={entry.label}
                      className="rounded-full border border-white/10 bg-slate-900/70 px-3 py-2 text-xs font-medium text-slate-200"
                    >
                      {entry.label}: {entry.minutes.toFixed(1)} min ({entry.sharePct}
                      %)
                    </span>
                  ))}
              </div>
            </>
          ) : (
            <p className="mt-4 leading-6 text-slate-400">
              No daily posture rollup was recorded on this day.
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-white/10 bg-slate-950/75 p-4 text-sm text-slate-300">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-300">
            Symptoms reported on this day
          </p>
          {overview.hasSymptomData ? (
            <>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <MiniDayMetric
                  label="Check-ins"
                  value={String(overview.symptomCheckInCount)}
                />
                <MiniDayMetric
                  label="Average severity"
                  value={`${overview.averageSymptomSeverity.toFixed(1)} / 5`}
                />
                <MiniDayMetric
                  label="Work impact"
                  value={overview.workInterferenceReported ? 'Yes' : 'No'}
                />
              </div>
              <p className="mt-4 leading-6 text-slate-400">
                {overview.workInterferenceReported
                  ? 'At least one symptom check-in reported that symptoms interfered with normal work that day.'
                  : 'No saved symptom check-in reported work interference on this day.'}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {overview.symptomsReported.map((label) => (
                  <span
                    key={`${overview.dateKey}-${label}`}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-200"
                  >
                    {label}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <p className="mt-4 leading-6 text-slate-400">
              No symptom check-in was reported on this day.
            </p>
          )}
        </section>
      </div>
    </article>
  );
}

type DayFlagProps = {
  label: string;
  tone: 'neutral' | 'good' | 'warning';
};

function DayFlag({ label, tone }: DayFlagProps) {
  const className = {
    neutral: 'border-white/10 bg-white/5 text-slate-300',
    good: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-100',
    warning: 'border-amber-400/25 bg-amber-400/10 text-amber-100',
  }[tone];

  return (
    <span
      className={`rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] ${className}`}
    >
      {label}
    </span>
  );
}

type MiniDayMetricProps = {
  label: string;
  value: string;
};

function MiniDayMetric({ label, value }: MiniDayMetricProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 font-semibold text-white">{value}</p>
    </div>
  );
}

type EmptyStateProps = {
  children: string;
};

function EmptyState({ children }: EmptyStateProps) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-sm leading-6 text-slate-400">
      {children}
    </div>
  );
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
