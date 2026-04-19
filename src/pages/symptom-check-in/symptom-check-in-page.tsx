import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  getPresetSymptomLabel,
  getSymptomDurationLabel,
  getSymptomSeverityLabel,
  symptomDurationOptions,
  symptomPresetGroups,
  symptomSeverityScale,
} from '@/core/symptoms/symptom-options';
import { normalizeSymptomLabel } from '@/core/symptoms/symptom-check-ins';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useSymptomCheckIns } from '@/hooks/useSymptomCheckIns';
import type {
  PresetSymptomId,
  SymptomCheckIn,
  SymptomDuration,
  SymptomSeverity,
} from '@/types/domain';

const DEFAULT_SEVERITY: SymptomSeverity = 3;
const DEFAULT_DURATION: SymptomDuration = '1-3-hours';
const RECENT_ENTRIES_SECTION_ID = 'recent-local-entries';
const DEFAULT_EXPANDED_GROUPS = symptomPresetGroups
  .slice(0, 2)
  .map((group) => group.title);

type SelectedSymptom = {
  kind: 'preset' | 'custom';
  id: string;
  label: string;
};

export function SymptomCheckInPage() {
  const [searchParams] = useSearchParams();
  const checkIns = useSymptomCheckIns();
  const dashboard = useDashboardData();
  const workspaceRef = useRef<HTMLDivElement | null>(null);

  const [selectedPresetSymptoms, setSelectedPresetSymptoms] = useState<
    PresetSymptomId[]
  >([]);
  const [selectedCustomSymptoms, setSelectedCustomSymptoms] = useState<
    string[]
  >([]);
  const [severity, setSeverity] = useState<SymptomSeverity>(DEFAULT_SEVERITY);
  const [duration, setDuration] = useState<SymptomDuration>(DEFAULT_DURATION);
  const [interferedWithWork, setInterferedWithWork] = useState(false);
  const [customSymptomDraft, setCustomSymptomDraft] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<'success' | 'info' | 'warning'>(
    'success',
  );
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [stepDirection, setStepDirection] = useState<'forward' | 'back'>(
    'forward',
  );
  const [showPostSaveActions, setShowPostSaveActions] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<string[]>(
    DEFAULT_EXPANDED_GROUPS,
  );

  const entrySource =
    searchParams.get('source') === 'daily-reminder'
      ? 'daily-reminder'
      : 'manual';
  const isDailyReminderEntry = entrySource === 'daily-reminder';
  const selectedSeverityLabel = getSymptomSeverityLabel(severity);
  const selectedSymptoms = useMemo<SelectedSymptom[]>(
    () =>
      [
        ...selectedPresetSymptoms.map((entry) => ({
          kind: 'preset' as const,
          id: entry,
          label: getPresetSymptomLabel(entry),
        })),
        ...selectedCustomSymptoms.map((entry) => ({
          kind: 'custom' as const,
          id: entry,
          label: entry,
        })),
      ].sort((left, right) => left.label.localeCompare(right.label)),
    [selectedCustomSymptoms, selectedPresetSymptoms],
  );
  const hasSelectedSymptoms = selectedSymptoms.length > 0;
  const latestEntry = checkIns.recentCheckIns[0] ?? null;
  const recentEntriesCount = checkIns.recentCheckIns.length;
  const severityFeedback = getSeverityFeedback(severity);

  useEffect(() => {
    if (!message || messageTone === 'success') {
      return;
    }

    const timer = window.setTimeout(() => {
      setMessage(null);
    }, 2400);

    return () => {
      window.clearTimeout(timer);
    };
  }, [message, messageTone]);

  async function handleAddCustomSymptom() {
    const normalizedLabel = normalizeSymptomLabel(customSymptomDraft);

    if (!normalizedLabel) {
      setShowPostSaveActions(false);
      setMessageTone('warning');
      setMessage('Enter a custom symptom label before adding it.');
      return;
    }

    try {
      const savedSymptom = await checkIns.addCustomSymptom(normalizedLabel);
      setSelectedCustomSymptoms((currentValues) =>
        currentValues.includes(savedSymptom.label)
          ? currentValues
          : [...currentValues, savedSymptom.label].sort((left, right) =>
              left.localeCompare(right),
            ),
      );
      setCustomSymptomDraft('');
      setShowPostSaveActions(false);
      setMessageTone('success');
      setMessage(`Saved "${savedSymptom.label}" locally for future check-ins.`);
    } catch {
      setMessage(null);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitCurrentCheckIn();
  }

  async function submitCurrentCheckIn() {
    try {
      await checkIns.submitCheckIn({
        source: entrySource,
        presetSymptoms: selectedPresetSymptoms,
        customSymptoms: selectedCustomSymptoms,
        severity,
        duration,
        interferedWithWork,
      });

      resetForm();
      setStepDirection('back');
      setCurrentStep(1);
      setShowPostSaveActions(true);
      setMessageTone('success');
      setMessage('Saved locally');
    } catch {
      setMessage(null);
    }
  }

  function handleStartCheckIn() {
    setStepDirection('back');
    setCurrentStep(1);
    setShowPostSaveActions(false);
    setMessage(null);
    workspaceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function handleContinueToStepTwo() {
    if (!hasSelectedSymptoms) {
      setShowPostSaveActions(false);
      setMessageTone('warning');
      setMessage('Choose at least one symptom to continue.');
      return;
    }

    setShowPostSaveActions(false);
    setMessage(null);
    setStepDirection('forward');
    setCurrentStep(2);
  }

  function handleBackToStepOne() {
    setShowPostSaveActions(false);
    setMessage(null);
    setStepDirection('back');
    setCurrentStep(1);
  }

  function handleLogAnother() {
    setShowPostSaveActions(false);
    setMessage(null);
    setStepDirection('back');
    setCurrentStep(1);
    workspaceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function handleRemoveSelectedSymptom(symptom: SelectedSymptom) {
    setShowPostSaveActions(false);
    if (symptom.kind === 'preset') {
      setSelectedPresetSymptoms((currentValues) =>
        currentValues.filter((value) => value !== symptom.id),
      );
      return;
    }

    setSelectedCustomSymptoms((currentValues) =>
      currentValues.filter((value) => value !== symptom.id),
    );
  }

  function toggleGroup(title: string) {
    setExpandedGroups((currentValues) =>
      currentValues.includes(title)
        ? currentValues.filter((value) => value !== title)
        : [...currentValues, title],
    );
  }

  function scrollToRecentEntries() {
    if (typeof document === 'undefined') {
      return;
    }

    document
      .getElementById(RECENT_ENTRIES_SECTION_ID)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div className="space-y-7">
      <SymptomsHero
        isDailyReminderEntry={isDailyReminderEntry}
        recentEntriesCount={recentEntriesCount}
        onStartCheckIn={handleStartCheckIn}
      />

      <section className="grid gap-3 md:grid-cols-3">
        <SummaryStatCard
          label="Today"
          value={
            checkIns.todayCheckIn
              ? `Logged at ${formatTime(checkIns.todayCheckIn.createdAt)}`
              : 'No entry yet'
          }
          detail={
            checkIns.todayCheckIn
              ? 'You can still save another check-in if things change.'
              : 'Start a check-in when something feels off.'
          }
        />
        <SummaryStatCard
          label="Recent average"
          value={
            dashboard.symptomSummary.checkInCount > 0
              ? `${dashboard.symptomSummary.averageSeverity.toFixed(1)} / 5`
              : 'No data yet'
          }
          detail={
            dashboard.symptomSummary.checkInCount > 0
              ? `${dashboard.symptomSummary.checkInCount} recent check-ins saved locally.`
              : 'Average severity appears after the first saved entry.'
          }
        />
        <SummaryStatCard
          label="Last entry"
          value={latestEntry ? formatDateTime(latestEntry.createdAt) : 'Nothing saved yet'}
          detail={
            latestEntry
              ? `${latestEntry.presetSymptoms.length + latestEntry.customSymptoms.length} symptoms in the latest check-in.`
              : 'Recent entries will appear here after the first save.'
          }
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.48fr)_minmax(320px,0.78fr)]">
        <div ref={workspaceRef}>
          <CheckInWorkspaceCard
            currentStep={currentStep}
            entrySource={entrySource}
            expandedGroups={expandedGroups}
            customSymptomDraft={customSymptomDraft}
            duration={duration}
            hasSelectedSymptoms={hasSelectedSymptoms}
            interferedWithWork={interferedWithWork}
            isSaving={checkIns.isSaving}
            savedCustomSymptoms={checkIns.savedCustomSymptoms}
            selectedCustomSymptoms={selectedCustomSymptoms}
            selectedPresetSymptoms={selectedPresetSymptoms}
            selectedSeverityLabel={selectedSeverityLabel}
            selectedSymptoms={selectedSymptoms}
            severity={severity}
            severityFeedback={severityFeedback}
            stepDirection={stepDirection}
            onBack={handleBackToStepOne}
            onContinue={handleContinueToStepTwo}
            onDurationChange={(nextDuration) => {
              setShowPostSaveActions(false);
              setDuration(nextDuration);
            }}
            onInterferedChange={(nextValue) => {
              setShowPostSaveActions(false);
              setInterferedWithWork(nextValue);
            }}
            onPresetToggle={(symptomId) => {
              setShowPostSaveActions(false);
              setSelectedPresetSymptoms((currentValues) =>
                currentValues.includes(symptomId)
                  ? currentValues.filter((value) => value !== symptomId)
                  : [...currentValues, symptomId].sort((left, right) =>
                      left.localeCompare(right),
                    ),
              );
            }}
            onCustomToggle={(label) => {
              setShowPostSaveActions(false);
              setSelectedCustomSymptoms((currentValues) =>
                currentValues.includes(label)
                  ? currentValues.filter((value) => value !== label)
                  : [...currentValues, label].sort((left, right) =>
                      left.localeCompare(right),
                    ),
              );
            }}
            onSelectedRemove={handleRemoveSelectedSymptom}
            onSeverityChange={(nextSeverity) => {
              setShowPostSaveActions(false);
              setSeverity(nextSeverity);
            }}
            onStepReset={() => {
              resetForm();
              setStepDirection('back');
              setCurrentStep(1);
              setShowPostSaveActions(false);
              setMessageTone('info');
              setMessage('Form cleared.');
            }}
            onSubmit={handleSubmit}
            onToggleGroup={toggleGroup}
            onCustomDraftChange={(value) => {
              setShowPostSaveActions(false);
              setCustomSymptomDraft(value);
            }}
            onCustomAdd={() => {
              void handleAddCustomSymptom();
            }}
          />

          {message ? (
            <div
              className={[
                'mt-4 rounded-2xl border px-4 py-3 text-sm',
                messageTone === 'success'
                  ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-100'
                  : messageTone === 'warning'
                    ? 'border-amber-400/20 bg-amber-400/10 text-amber-100'
                    : 'border-white/10 bg-white/5 text-slate-200',
              ].join(' ')}
            >
              <p>{message}</p>
              {showPostSaveActions ? (
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    className="rounded-full border border-current/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-current transition hover:bg-white/10"
                    onClick={handleLogAnother}
                  >
                    Log another
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-current/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-current transition hover:bg-white/10"
                    onClick={scrollToRecentEntries}
                  >
                    View recent entries
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}

          {checkIns.error ? (
            <p className="mt-4 rounded-2xl border border-orange-400/20 bg-orange-400/10 px-4 py-3 text-sm text-orange-100">
              {checkIns.error}
            </p>
          ) : null}
        </div>

        <aside className="space-y-4">
          <RecentEntriesCard
            id={RECENT_ENTRIES_SECTION_ID}
            entries={checkIns.recentCheckIns}
            isLoading={checkIns.isLoading}
          />
          <PrivacyNoteCard />
        </aside>
      </section>
    </div>
  );

  function resetForm() {
    setSelectedPresetSymptoms([]);
    setSelectedCustomSymptoms([]);
    setSeverity(DEFAULT_SEVERITY);
    setDuration(DEFAULT_DURATION);
    setInterferedWithWork(false);
    setCustomSymptomDraft('');
  }
}

function SymptomsHero({
  isDailyReminderEntry,
  recentEntriesCount,
  onStartCheckIn,
}: {
  isDailyReminderEntry: boolean;
  recentEntriesCount: number;
  onStartCheckIn: () => void;
}) {
  return (
    <section className="motion-card-reveal rounded-[1.6rem] border border-white/10 bg-[linear-gradient(180deg,rgba(20,29,49,0.96)_0%,rgba(15,23,42,0.92)_100%)] px-5 py-5 shadow-[0_24px_70px_-42px_rgba(4,9,23,0.95)] md:px-6 md:py-6">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_auto] xl:items-center">
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent-300">
              Symptoms
            </p>
            <h1 className="font-display text-[2rem] tracking-[-0.035em] text-white md:text-[2.35rem]">
              Log how you feel in under a minute
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-slate-300">
              Save a quick local check-in and keep everything on this device.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <MetaPill label="Local only" />
            <MetaPill label="2-step flow" />
            <MetaPill
              label={
                recentEntriesCount > 0
                  ? `${recentEntriesCount} recent entries saved`
                  : 'No recent entries yet'
              }
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 xl:justify-end">
          <button
            type="button"
            className="inline-flex items-center rounded-full bg-[linear-gradient(135deg,#7dd3fc_0%,#5bc0ff_45%,#38bdf8_100%)] px-5 py-3 text-sm font-semibold text-slate-950 shadow-[0_18px_36px_-22px_rgba(91,192,255,0.75)] transition-all duration-200 ease-out hover:-translate-y-[1px] hover:brightness-105 active:scale-[0.98]"
            onClick={onStartCheckIn}
          >
            Start check-in
          </button>
          <Link
            to={
              isDailyReminderEntry
                ? '/symptoms'
                : '/symptoms?source=daily-reminder'
            }
            className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white transition-all duration-200 ease-out hover:-translate-y-[1px] hover:bg-white/[0.08] active:scale-[0.98]"
          >
            {isDailyReminderEntry ? 'Reminder entry active' : 'Open reminder entry'}
          </Link>
        </div>
      </div>
    </section>
  );
}

function MetaPill({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
      {label}
    </span>
  );
}

function SummaryStatCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="rounded-[1.25rem] border border-white/10 bg-slate-950/58 px-4 py-4 shadow-[0_16px_34px_-28px_rgba(4,9,23,0.92)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent-300">
        {label}
      </p>
      <p className="mt-2 text-base font-semibold text-white">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-400">{detail}</p>
    </article>
  );
}

type CheckInWorkspaceCardProps = {
  currentStep: 1 | 2;
  entrySource: 'manual' | 'daily-reminder';
  expandedGroups: string[];
  customSymptomDraft: string;
  duration: SymptomDuration;
  hasSelectedSymptoms: boolean;
  interferedWithWork: boolean;
  isSaving: boolean;
  savedCustomSymptoms: Array<{ id: string; label: string }>;
  selectedCustomSymptoms: string[];
  selectedPresetSymptoms: PresetSymptomId[];
  selectedSeverityLabel: string;
  selectedSymptoms: SelectedSymptom[];
  severity: SymptomSeverity;
  severityFeedback: string;
  stepDirection: 'forward' | 'back';
  onBack: () => void;
  onContinue: () => void;
  onDurationChange: (duration: SymptomDuration) => void;
  onInterferedChange: (value: boolean) => void;
  onPresetToggle: (symptomId: PresetSymptomId) => void;
  onCustomToggle: (label: string) => void;
  onSelectedRemove: (symptom: SelectedSymptom) => void;
  onSeverityChange: (severity: SymptomSeverity) => void;
  onStepReset: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onToggleGroup: (title: string) => void;
  onCustomDraftChange: (value: string) => void;
  onCustomAdd: () => void;
};

function CheckInWorkspaceCard({
  currentStep,
  entrySource,
  expandedGroups,
  customSymptomDraft,
  duration,
  hasSelectedSymptoms,
  interferedWithWork,
  isSaving,
  savedCustomSymptoms,
  selectedCustomSymptoms,
  selectedPresetSymptoms,
  selectedSeverityLabel,
  selectedSymptoms,
  severity,
  severityFeedback,
  stepDirection,
  onBack,
  onContinue,
  onDurationChange,
  onInterferedChange,
  onPresetToggle,
  onCustomToggle,
  onSelectedRemove,
  onSeverityChange,
  onStepReset,
  onSubmit,
  onToggleGroup,
  onCustomDraftChange,
  onCustomAdd,
}: CheckInWorkspaceCardProps) {
  return (
    <form
      className="rounded-[1.65rem] border border-white/10 bg-[linear-gradient(180deg,rgba(20,29,49,0.92)_0%,rgba(15,23,42,0.9)_100%)] p-5 shadow-[0_26px_70px_-42px_rgba(4,9,23,0.96)] md:p-6"
      onSubmit={onSubmit}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-accent-300">
            Step {currentStep} of 2
          </p>
          <h2 className="font-display text-[1.65rem] tracking-[-0.03em] text-white">
            {currentStep === 1
              ? 'What feels off today?'
              : 'How much did it affect you?'}
          </h2>
            <p className="max-w-2xl text-sm leading-6 text-slate-400">
              {currentStep === 1
                ? 'Select symptoms first, then continue once the tray looks right.'
                : 'Finish the check-in with severity, duration, and work impact.'}
            </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <StepIndicator
            currentStep={currentStep}
            selectedCount={selectedSymptoms.length}
          />
          <div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-slate-200">
            {entrySource === 'daily-reminder' ? 'Reminder entry' : 'Manual entry'}
          </div>
        </div>
      </div>

      <div
        key={currentStep}
        className={[
          'mt-5 space-y-5',
          stepDirection === 'forward' ? 'motion-step-forward' : 'motion-step-back',
        ].join(' ')}
      >
        {currentStep === 1 ? (
          <>
            <SelectionTray
              hasSelectedSymptoms={hasSelectedSymptoms}
              selectedSymptoms={selectedSymptoms}
              onRemove={onSelectedRemove}
            />

            <section className="space-y-3">
              {symptomPresetGroups.map((group) => {
                const isExpanded = expandedGroups.includes(group.title);

                return (
                  <AccordionCategoryCard
                    key={group.title}
                    description={group.description}
                    expanded={isExpanded}
                    title={group.title}
                    onToggle={() => {
                      onToggleGroup(group.title);
                    }}
                  >
                    <div className="flex flex-wrap gap-3">
                      {group.items.map((item) => (
                        <SymptomChip
                          key={item.id}
                          label={item.label}
                          selected={selectedPresetSymptoms.includes(item.id)}
                          onClick={() => {
                            onPresetToggle(item.id);
                          }}
                        />
                      ))}
                    </div>
                  </AccordionCategoryCard>
                );
              })}
            </section>

            <section className="rounded-[1.35rem] border border-white/10 bg-slate-950/52 p-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent-300">
                    Custom symptom
                  </p>
                  <p className="text-sm text-slate-400">
                    Save a personal symptom label locally and reuse it later.
                  </p>
                </div>
                <div className="flex min-w-[240px] flex-1 gap-3">
                  <input
                    type="text"
                    value={customSymptomDraft}
                    onChange={(event) => {
                      onCustomDraftChange(event.target.value);
                    }}
                    placeholder="Add a custom symptom"
                    className="min-w-0 flex-1 rounded-full border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
                  />
                  <button
                    type="button"
                    className="rounded-full border border-accent-300/30 bg-accent-400/15 px-4 py-3 text-sm font-semibold text-white transition-all duration-200 ease-out hover:-translate-y-[1px] hover:bg-accent-400/20 active:scale-[0.98]"
                    onClick={onCustomAdd}
                    disabled={isSaving}
                  >
                    Add
                  </button>
                </div>
              </div>
              {savedCustomSymptoms.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-3">
                  {savedCustomSymptoms.map((item) => (
                    <SymptomChip
                      key={item.id}
                      label={item.label}
                      selected={selectedCustomSymptoms.includes(item.label)}
                      tone="emerald"
                      onClick={() => {
                        onCustomToggle(item.label);
                      }}
                    />
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-500">
                  Saved custom symptoms will appear here.
                </p>
              )}
            </section>

            <WorkspaceActionBar
              helperText={
                hasSelectedSymptoms
                  ? `${selectedSymptoms.length} symptom${selectedSymptoms.length === 1 ? '' : 's'} ready for the next step`
                  : 'Choose at least one symptom to continue.'
              }
            >
              <button
                type="button"
                className="rounded-full bg-[linear-gradient(135deg,#7dd3fc_0%,#5bc0ff_45%,#38bdf8_100%)] px-6 py-3.5 text-sm font-semibold text-slate-950 shadow-[0_18px_36px_-22px_rgba(91,192,255,0.75)] transition-all duration-200 ease-out hover:-translate-y-[1px] hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                onClick={onContinue}
                disabled={!hasSelectedSymptoms}
              >
                Continue
                <span className="ml-1" aria-hidden="true">
                  -
                  {'>'}
                </span>
              </button>
            </WorkspaceActionBar>
          </>
        ) : (
          <>
            <SelectionTray
              hasSelectedSymptoms={hasSelectedSymptoms}
              selectedSymptoms={selectedSymptoms}
              compact
            />

            <section className="grid gap-4 lg:grid-cols-[1.02fr_0.98fr]">
              <WorkspaceSection
                eyebrow="Severity"
                title={`${severity} / 5`}
                description={severityFeedback}
                trailing={
                  <div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-slate-300">
                    {selectedSeverityLabel}
                  </div>
                }
              >
                <input
                  type="range"
                  min={1}
                  max={5}
                  step={1}
                  value={severity}
                  aria-label="Severity"
                  className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-800 accent-cyan-300"
                  onChange={(event) => {
                    onSeverityChange(Number(event.target.value) as SymptomSeverity);
                  }}
                />
                <div className="mt-3 grid grid-cols-5 gap-2 text-center text-xs text-slate-400">
                  {symptomSeverityScale.map((entry) => (
                    <span key={entry.value}>{entry.label}</span>
                  ))}
                </div>
              </WorkspaceSection>

              <WorkspaceSection
                eyebrow="Work impact"
                title="Did it affect your work today?"
                description="Choose the option that best matches how the symptoms felt while working."
              >
                <div className="flex flex-wrap gap-3">
                  <ToggleChoice
                    active={!interferedWithWork}
                    label="No, I managed fine"
                    onClick={() => {
                      onInterferedChange(false);
                    }}
                  />
                  <ToggleChoice
                    active={interferedWithWork}
                    label="Yes, it affected my work"
                    tone="amber"
                    onClick={() => {
                      onInterferedChange(true);
                    }}
                  />
                </div>
              </WorkspaceSection>
            </section>

            <WorkspaceSection
              eyebrow="Duration"
              title="How long did it last?"
              description="Pick the option that fits best for this check-in."
            >
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {symptomDurationOptions.map((option) => (
                  <DurationCard
                    key={option.id}
                    active={duration === option.id}
                    detail={option.detail}
                    label={option.label}
                    onClick={() => {
                      onDurationChange(option.id);
                    }}
                  />
                ))}
              </div>
            </WorkspaceSection>

            <WorkspaceActionBar helperText="Everything still saves locally on this device only.">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  className="rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-white transition-all duration-200 ease-out hover:-translate-y-[1px] hover:bg-white/[0.06] active:scale-[0.98]"
                  onClick={onBack}
                >
                  Back
                </button>
                <button
                  type="button"
                  className="rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-white transition-all duration-200 ease-out hover:-translate-y-[1px] hover:bg-white/[0.06] active:scale-[0.98]"
                  onClick={onStepReset}
                  disabled={isSaving}
                >
                  Reset
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-[linear-gradient(135deg,#7dd3fc_0%,#5bc0ff_45%,#38bdf8_100%)] px-6 py-3.5 text-sm font-semibold text-slate-950 shadow-[0_18px_36px_-22px_rgba(91,192,255,0.75)] transition-all duration-200 ease-out hover:-translate-y-[1px] hover:brightness-105 active:scale-[0.98]"
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving locally...' : 'Save Symptom Check-In'}
                </button>
              </div>
            </WorkspaceActionBar>
          </>
        )}
      </div>
    </form>
  );
}

function SelectionTray({
  hasSelectedSymptoms,
  selectedSymptoms,
  onRemove,
  compact = false,
}: {
  hasSelectedSymptoms: boolean;
  selectedSymptoms: SelectedSymptom[];
  onRemove?: (symptom: SelectedSymptom) => void;
  compact?: boolean;
}) {
  return (
    <section className="rounded-[1.35rem] border border-white/10 bg-slate-950/62 px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent-300/90">
            Selected symptoms
          </p>
          <p className="mt-1 text-sm text-slate-400">
            {hasSelectedSymptoms
              ? `${selectedSymptoms.length} selected`
              : compact
                ? 'No symptoms selected yet.'
                : 'Choose one or more symptoms to continue.'}
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {hasSelectedSymptoms ? (
          selectedSymptoms.map((symptom) =>
            onRemove ? (
              <SelectedSymptomChip
                key={`${symptom.kind}-${symptom.id}`}
                label={symptom.label}
                onRemove={() => {
                  onRemove(symptom);
                }}
              />
            ) : (
              <span
                key={`${symptom.kind}-${symptom.id}`}
                className="rounded-full border border-accent-300/20 bg-accent-400/10 px-3 py-2 text-xs font-medium text-slate-100"
              >
                {symptom.label}
              </span>
            ),
          )
        ) : (
          <p className="text-sm leading-6 text-slate-400">
            Your selection will appear here as you tap chips.
          </p>
        )}
      </div>
    </section>
  );
}

function AccordionCategoryCard({
  title,
  description,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  description: string;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-[1.35rem] border border-white/[0.08] bg-slate-950/42">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-all duration-200 ease-out hover:bg-white/[0.03]"
        aria-expanded={expanded}
        onClick={onToggle}
      >
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
            {title}
          </p>
          <p className="mt-1.5 text-sm text-slate-500">{description}</p>
        </div>
        <ChevronIcon expanded={expanded} />
      </button>
      <div className="accordion-shell" data-open={expanded ? 'true' : 'false'}>
        <div className="accordion-inner border-t border-white/[0.06] px-5 pb-5 pt-4">
          {children}
        </div>
      </div>
    </div>
  );
}

function WorkspaceSection({
  eyebrow,
  title,
  description,
  trailing,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  trailing?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[1.35rem] border border-white/10 bg-slate-950/55 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent-300">
            {eyebrow}
          </p>
          <h3 className="mt-2 text-[1.15rem] font-semibold text-white">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
        </div>
        {trailing ? <div>{trailing}</div> : null}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function WorkspaceActionBar({
  helperText,
  children,
}: {
  helperText: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5">
      <p className="text-sm text-slate-400">{helperText}</p>
      <div>{children}</div>
    </div>
  );
}

function ToggleChoice({
  active,
  label,
  tone = 'blue',
  onClick,
}: {
  active: boolean;
  label: string;
  tone?: 'blue' | 'amber';
  onClick: () => void;
}) {
  const activeClassName =
    tone === 'amber'
      ? 'border-amber-300/60 bg-amber-400/15 text-white'
      : 'border-accent-300/70 bg-accent-400/15 text-white';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      className={[
        'rounded-full border px-5 py-3 text-sm font-semibold transition-all duration-200 ease-out hover:-translate-y-[1px] active:scale-[0.98]',
        active
          ? activeClassName
          : 'border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white',
      ].join(' ')}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function DurationCard({
  active,
  label,
  detail,
  onClick,
}: {
  active: boolean;
  label: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={[
        'rounded-[1.15rem] border p-4 text-left transition-all duration-200 ease-out hover:-translate-y-[1px] active:scale-[0.985]',
        active
          ? 'border-accent-300/70 bg-accent-400/15 text-white shadow-[0_0_0_1px_rgba(91,192,255,0.08),0_14px_32px_-20px_rgba(91,192,255,0.5)]'
          : 'border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/15 hover:bg-white/[0.08] hover:text-white',
      ].join(' ')}
      aria-pressed={active}
      onClick={onClick}
    >
      <p className="font-semibold">{label}</p>
      <p className="mt-2 text-sm text-slate-400">{detail}</p>
    </button>
  );
}

function RecentEntriesCard({
  id,
  entries,
  isLoading,
}: {
  id: string;
  entries: SymptomCheckIn[];
  isLoading: boolean;
}) {
  return (
    <article
      id={id}
      className="rounded-[1.5rem] border border-white/10 bg-slate-950/70 p-5 shadow-[0_20px_50px_-34px_rgba(4,9,23,0.95)]"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent-300">
        Recent local entries
      </p>
      <h2 className="mt-2 text-[1.35rem] font-semibold text-white">
        Symptom history for this browser
      </h2>
      {isLoading ? (
        <p className="mt-4 text-sm text-slate-400">Loading local symptom data...</p>
      ) : entries.length > 0 ? (
        <div className="mt-4 space-y-3">
          {entries.map((entry) => (
            <CheckInCard key={entry.id} checkIn={entry} />
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm leading-6 text-slate-400">
          No symptom check-ins are stored yet.
        </p>
      )}
    </article>
  );
}

function PrivacyNoteCard() {
  return (
    <article className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5 shadow-[0_20px_50px_-34px_rgba(4,9,23,0.9)]">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent-300">
        Privacy
      </p>
      <h2 className="mt-2 text-[1.2rem] font-semibold text-white">
        Kept local and simple
      </h2>
      <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-300">
        <li>Your data stays on this device.</li>
        <li>No cloud sync in this version.</li>
      </ul>
    </article>
  );
}

function StepIndicator({
  currentStep,
  selectedCount,
}: {
  currentStep: 1 | 2;
  selectedCount: number;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent-300">
        Step {currentStep} of 2
        {currentStep === 1 ? ` - ${selectedCount} symptoms selected` : ''}
      </p>
      <div className="mt-2 flex items-center gap-2">
        {[1, 2].map((step) => (
          <span
            key={step}
            className={[
              'h-2 rounded-full transition-all duration-200',
              currentStep === step
                ? 'w-8 bg-accent-300'
                : currentStep > step
                  ? 'w-6 bg-accent-300/70'
                  : 'w-6 bg-white/10',
            ].join(' ')}
          />
        ))}
      </div>
    </div>
  );
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={[
        'h-4 w-4 text-slate-400 transition-transform duration-200',
        expanded ? 'rotate-180' : '',
      ].join(' ')}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m4 6 4 4 4-4" />
    </svg>
  );
}

type SymptomChipProps = {
  label: string;
  selected: boolean;
  onClick: () => void;
  tone?: 'blue' | 'emerald';
};

function SymptomChip({
  label,
  selected,
  onClick,
  tone = 'blue',
}: SymptomChipProps) {
  const selectedClassName =
    tone === 'emerald'
      ? 'border-emerald-300/65 bg-emerald-400/15 text-white shadow-[0_0_0_1px_rgba(74,222,128,0.08),0_16px_34px_-20px_rgba(74,222,128,0.55)] scale-[1.01]'
      : 'border-accent-300/75 bg-accent-400/15 text-white shadow-[0_0_0_1px_rgba(91,192,255,0.1),0_16px_34px_-20px_rgba(91,192,255,0.6)] scale-[1.01]';
  const indicatorClassName =
    tone === 'emerald'
      ? 'border-emerald-200 bg-emerald-300 text-slate-950'
      : 'border-accent-200 bg-accent-300 text-slate-950';

  return (
    <button
      type="button"
      className={[
        'inline-flex min-h-[48px] items-center gap-2 rounded-full border px-[18px] py-3 text-sm font-medium transition-all duration-200 ease-out hover:-translate-y-[1px] active:scale-[0.985]',
        selected
          ? selectedClassName
          : 'border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/15 hover:bg-white/[0.08] hover:text-white',
      ].join(' ')}
      aria-pressed={selected}
      onClick={onClick}
    >
      <span
        className={[
          'flex h-[18px] w-[18px] items-center justify-center rounded-full border transition-all duration-200',
          selected
            ? indicatorClassName
            : 'border-white/10 bg-transparent text-transparent',
        ].join(' ')}
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 16 16"
          className="h-3 w-3"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m3.5 8 2.5 2.5L12.5 4.5" />
        </svg>
      </span>
      {label}
    </button>
  );
}

function SelectedSymptomChip({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-accent-300/20 bg-accent-400/10 px-3 py-2 text-xs font-medium text-slate-100">
      {label}
      <button
        type="button"
        className="flex h-5 w-5 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-[11px] text-slate-200 transition hover:bg-white/[0.12]"
        onClick={onRemove}
        aria-label={`Remove ${label}`}
      >
        x
      </button>
    </span>
  );
}

type CheckInCardProps = {
  checkIn: SymptomCheckIn;
};

function CheckInCard({ checkIn }: CheckInCardProps) {
  const symptomLabels = [
    ...checkIn.presetSymptoms.map((entry) => getPresetSymptomLabel(entry)),
    ...checkIn.customSymptoms,
  ];

  return (
    <article className="rounded-[1.15rem] border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
            {formatDateTime(checkIn.createdAt)}
          </p>
          <p className="mt-2 text-sm font-semibold text-white">
            Severity {checkIn.severity}/5
          </p>
          <p className="mt-1 text-sm text-slate-300">
            {getSymptomSeverityLabel(checkIn.severity)}
          </p>
        </div>
        <span className="rounded-full border border-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
          {checkIn.source === 'daily-reminder' ? 'Reminder' : 'Manual'}
        </span>
      </div>
      <p className="mt-2 text-sm text-slate-400">
        {getSymptomDurationLabel(checkIn.duration)} - Work impact:{' '}
        {checkIn.interferedWithWork ? 'Yes' : 'No'}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {symptomLabels.map((label) => (
          <span
            key={`${checkIn.id}-${label}`}
            className="rounded-full border border-white/10 bg-slate-900/72 px-2.5 py-1.5 text-[11px] font-medium text-slate-200"
          >
            {label}
          </span>
        ))}
      </div>
    </article>
  );
}

function formatDateTime(timestamp: number) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(timestamp);
}

function formatTime(timestamp: number) {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(timestamp);
}

function getSeverityFeedback(severity: SymptomSeverity) {
  switch (severity) {
    case 1:
      return 'Very light - barely noticeable right now.';
    case 2:
      return 'Mild - present, but easy to work around.';
    case 3:
      return 'Noticeable - slightly affecting comfort.';
    case 4:
      return 'Strong - clearly affecting how desk work feels.';
    case 5:
    default:
      return 'Intense - hard to ignore during the day.';
  }
}
