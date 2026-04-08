import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type UseFormRegisterReturn } from 'react-hook-form';
import { z } from 'zod';
import { PageHeader } from '@/components/common/page-header';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useCalibrationProfile } from '@/hooks/useCalibrationProfile';

const reminderSettingsSchema = z.object({
  enabled: z.boolean(),
  minimumSittingBeforeReminderMin: z.coerce.number().int().min(15).max(180),
  slouchThresholdBeforeReminderSec: z.coerce.number().int().min(60).max(900),
  reminderCooldownMin: z.coerce.number().int().min(5).max(180),
  workingHoursStart: z.string().optional(),
  workingHoursEnd: z.string().optional(),
});

type ReminderSettingsFormValues = z.infer<typeof reminderSettingsSchema>;

export function SettingsPage() {
  const appSettings = useAppSettings();
  const calibration = useCalibrationProfile();
  const [message, setMessage] = useState<string | null>(null);
  const form = useForm<ReminderSettingsFormValues>({
    resolver: zodResolver(reminderSettingsSchema),
    defaultValues: {
      enabled: true,
      minimumSittingBeforeReminderMin: 45,
      slouchThresholdBeforeReminderSec: 180,
      reminderCooldownMin: 20,
      workingHoursStart: '',
      workingHoursEnd: '',
    },
  });

  useEffect(() => {
    form.reset({
      enabled: appSettings.settings.reminderSettings.enabled,
      minimumSittingBeforeReminderMin: appSettings.settings.reminderSettings.minimumSittingBeforeReminderMin,
      slouchThresholdBeforeReminderSec: appSettings.settings.reminderSettings.slouchThresholdBeforeReminderSec,
      reminderCooldownMin: appSettings.settings.reminderSettings.reminderCooldownMin,
      workingHoursStart: appSettings.settings.reminderSettings.workingHoursStart ?? '',
      workingHoursEnd: appSettings.settings.reminderSettings.workingHoursEnd ?? '',
    });
  }, [appSettings.settings.reminderSettings, form]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Milestone 8"
        title="Settings now cover reminders, recalibration, and privacy shortcuts"
        description="Reminder preferences still live here, and Milestone 8 adds clearer paths to recalibration and browser-side data controls so the product feels user-ready instead of developer-only."
      />

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <article className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-panel backdrop-blur">
          <h2 className="font-display text-xl text-white">Reminder controls</h2>
          <form
            className="mt-6 space-y-5"
            onSubmit={(event) => {
              void form.handleSubmit(async (values) => {
                setMessage(null);

                try {
                  await appSettings.saveReminderSettings({
                    enabled: values.enabled,
                    minimumSittingBeforeReminderMin: values.minimumSittingBeforeReminderMin,
                    slouchThresholdBeforeReminderSec: values.slouchThresholdBeforeReminderSec,
                    reminderCooldownMin: values.reminderCooldownMin,
                    workingHoursStart: values.workingHoursStart || undefined,
                    workingHoursEnd: values.workingHoursEnd || undefined,
                  });
                  setMessage('Reminder preferences saved locally.');
                } catch (error) {
                  setMessage(error instanceof Error ? error.message : 'Reminder settings could not be saved.');
                }
              })(event);
            }}
          >
            <label className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-4 text-sm text-slate-300">
              <span>
                <span className="block font-semibold text-white">Enable reminders</span>
                <span className="mt-1 block text-slate-400">Allow the app to show posture and break nudges during live monitoring.</span>
              </span>
              <input type="checkbox" className="h-5 w-5 rounded border-white/20 bg-slate-900 text-accent-400" {...form.register('enabled')} />
            </label>

            <div className="grid gap-4 md:grid-cols-3">
              <NumberField
                label="Break reminder"
                suffix="minutes"
                error={form.formState.errors.minimumSittingBeforeReminderMin?.message}
                registration={form.register('minimumSittingBeforeReminderMin', { valueAsNumber: true })}
              />
              <NumberField
                label="Posture threshold"
                suffix="seconds"
                error={form.formState.errors.slouchThresholdBeforeReminderSec?.message}
                registration={form.register('slouchThresholdBeforeReminderSec', { valueAsNumber: true })}
              />
              <NumberField
                label="Cooldown"
                suffix="minutes"
                error={form.formState.errors.reminderCooldownMin?.message}
                registration={form.register('reminderCooldownMin', { valueAsNumber: true })}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <TimeField
                label="Working hours start"
                error={form.formState.errors.workingHoursStart?.message}
                registration={form.register('workingHoursStart')}
              />
              <TimeField
                label="Working hours end"
                error={form.formState.errors.workingHoursEnd?.message}
                registration={form.register('workingHoursEnd')}
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                className="rounded-full bg-accent-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-accent-300"
                disabled={appSettings.isLoading || form.formState.isSubmitting}
              >
                Save reminder settings
              </button>
              <button
                type="button"
                className="rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                onClick={() => {
                  form.reset({
                    enabled: appSettings.settings.reminderSettings.enabled,
                    minimumSittingBeforeReminderMin: appSettings.settings.reminderSettings.minimumSittingBeforeReminderMin,
                    slouchThresholdBeforeReminderSec: appSettings.settings.reminderSettings.slouchThresholdBeforeReminderSec,
                    reminderCooldownMin: appSettings.settings.reminderSettings.reminderCooldownMin,
                    workingHoursStart: appSettings.settings.reminderSettings.workingHoursStart ?? '',
                    workingHoursEnd: appSettings.settings.reminderSettings.workingHoursEnd ?? '',
                  });
                  setMessage('Form reset to the last saved values.');
                }}
              >
                Reset form
              </button>
            </div>

            {message ? <p className="text-sm text-accent-300">{message}</p> : null}
            {appSettings.error ? <p className="text-sm text-orange-200">{appSettings.error}</p> : null}
          </form>
        </article>

        <div className="space-y-4">
          <article className="rounded-3xl border border-white/10 bg-slate-950/60 p-6 shadow-panel">
            <h2 className="font-display text-xl text-white">How the engine behaves</h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
              <li>Posture nudges only appear after sustained mild or deep slouch states.</li>
              <li>Break nudges depend on the current sitting bout instead of total session time.</li>
              <li>Cooldowns suppress repeat nudges so the UI stays supportive rather than noisy.</li>
              <li>Working hours are optional. Leave them blank to allow reminders at any time.</li>
            </ul>

            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
              <p className="font-semibold text-white">Current saved values</p>
              <p className="mt-3">Break reminder: {appSettings.settings.reminderSettings.minimumSittingBeforeReminderMin} min</p>
              <p>Posture threshold: {appSettings.settings.reminderSettings.slouchThresholdBeforeReminderSec} sec</p>
              <p>Cooldown: {appSettings.settings.reminderSettings.reminderCooldownMin} min</p>
              <p>
                Working hours: {appSettings.settings.reminderSettings.workingHoursStart ?? 'any'} -{' '}
                {appSettings.settings.reminderSettings.workingHoursEnd ?? 'any'}
              </p>
            </div>
          </article>

          <article className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-panel backdrop-blur">
            <h2 className="font-display text-xl text-white">Quick actions</h2>
            <div className="mt-4 space-y-4 text-sm leading-6 text-slate-300">
              <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-4">
                <p className="font-semibold text-white">Calibration status</p>
                <p className="mt-2">
                  {calibration.profile
                    ? 'A saved calibration profile is available. Re-run onboarding any time your desk or camera setup changes.'
                    : 'No saved calibration profile detected yet. Run onboarding to create a personal baseline.'}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  to="/onboarding"
                  className="inline-flex items-center rounded-full bg-accent-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-accent-300"
                >
                  Open Onboarding
                </Link>
                <Link
                  to="/privacy"
                  className="inline-flex items-center rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Privacy Controls
                </Link>
              </div>

              <p className="text-slate-400">
                Privacy-sensitive actions like export, clear history, and full local reset now live on the privacy screen instead of being hidden behind developer tooling.
              </p>
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}

type NumberFieldProps = {
  label: string;
  suffix: string;
  error?: string;
  registration: UseFormRegisterReturn;
};

function NumberField({ label, suffix, error, registration }: NumberFieldProps) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-semibold uppercase tracking-[0.24em] text-accent-300">{label}</span>
      <div className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3">
        <input type="number" min={0} className="w-full bg-transparent text-sm text-white outline-none" {...registration} />
      </div>
      <p className="text-xs text-slate-400">{suffix}</p>
      {error ? <p className="text-xs text-orange-200">{error}</p> : null}
    </label>
  );
}

type TimeFieldProps = {
  label: string;
  error?: string;
  registration: UseFormRegisterReturn;
};

function TimeField({ label, error, registration }: TimeFieldProps) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-semibold uppercase tracking-[0.24em] text-accent-300">{label}</span>
      <div className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3">
        <input type="time" className="w-full bg-transparent text-sm text-white outline-none" {...registration} />
      </div>
      {error ? <p className="text-xs text-orange-200">{error}</p> : null}
    </label>
  );
}
