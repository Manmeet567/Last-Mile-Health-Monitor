import { toDateKey } from '@/utils/date';
import type {
  PresetSymptomId,
  SymptomCheckIn,
  SymptomCheckInSource,
  SymptomDuration,
  SymptomSeverity,
} from '@/types/domain';

type BuildSymptomCheckInOptions = {
  id?: string;
  createdAt?: number;
  source: SymptomCheckInSource;
  presetSymptoms: PresetSymptomId[];
  customSymptoms: string[];
  severity: SymptomSeverity;
  duration: SymptomDuration;
  interferedWithWork: boolean;
};

export function normalizeSymptomLabel(label: string) {
  return label.trim().replace(/\s+/g, ' ');
}

export function normalizeCustomSymptomLabels(labels: string[]) {
  const dedupedLabels = new Map<string, string>();

  for (const label of labels) {
    const normalizedLabel = normalizeSymptomLabel(label);

    if (!normalizedLabel) {
      continue;
    }

    const key = normalizedLabel.toLocaleLowerCase();

    if (!dedupedLabels.has(key)) {
      dedupedLabels.set(key, normalizedLabel);
    }
  }

  return [...dedupedLabels.values()].sort((left, right) =>
    left.localeCompare(right),
  );
}

export function normalizePresetSymptoms(symptoms: PresetSymptomId[]) {
  return [...new Set(symptoms)].sort((left, right) =>
    left.localeCompare(right),
  );
}

export function buildSymptomCheckIn(
  options: BuildSymptomCheckInOptions,
): SymptomCheckIn {
  const createdAt = options.createdAt ?? Date.now();

  return {
    id: options.id ?? `symptom-check-in-${createdAt}`,
    createdAt,
    dateKey: toDateKey(createdAt),
    source: options.source,
    presetSymptoms: normalizePresetSymptoms(options.presetSymptoms),
    customSymptoms: normalizeCustomSymptomLabels(options.customSymptoms),
    severity: options.severity,
    duration: options.duration,
    interferedWithWork: options.interferedWithWork,
  };
}

export function symptomSelectionCount(
  checkIn: Pick<SymptomCheckIn, 'presetSymptoms' | 'customSymptoms'>,
) {
  return checkIn.presetSymptoms.length + checkIn.customSymptoms.length;
}
