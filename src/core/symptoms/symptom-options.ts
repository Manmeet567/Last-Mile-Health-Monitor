import type {
  PresetSymptomId,
  SymptomDuration,
  SymptomSeverity,
} from '@/types/domain';

export const symptomPresetGroups: Array<{
  title: string;
  description: string;
  items: Array<{
    id: PresetSymptomId;
    label: string;
  }>;
}> = [
  {
    title: 'Pain / discomfort',
    description: 'Common desk posture and loading discomfort patterns.',
    items: [
      { id: 'neck-pain-or-stiffness', label: 'Neck pain or stiffness' },
      { id: 'upper-back-discomfort', label: 'Upper back discomfort' },
      { id: 'lower-back-discomfort', label: 'Lower back discomfort' },
      { id: 'shoulder-tightness', label: 'Shoulder tightness' },
      { id: 'wrist-hand-discomfort', label: 'Wrist/hand discomfort' },
    ],
  },
  {
    title: 'Eye / head',
    description: 'Screen-load symptoms that often build during desk work.',
    items: [
      { id: 'eye-strain', label: 'Eye strain' },
      { id: 'headache', label: 'Headache' },
    ],
  },
  {
    title: 'Nerve / warning',
    description:
      'Signals worth logging clearly even when they feel intermittent.',
    items: [
      { id: 'numbness-or-tingling', label: 'Numbness or tingling' },
      { id: 'dizziness', label: 'Dizziness' },
    ],
  },
  {
    title: 'Fatigue / function',
    description: 'Symptoms that change comfort, stamina, or work quality.',
    items: [
      {
        id: 'fatigue-after-long-sitting',
        label: 'Fatigue after long sitting',
      },
      { id: 'reduced-focus', label: 'Reduced focus' },
      {
        id: 'poor-sleep-affecting-desk-comfort',
        label: 'Poor sleep affecting desk comfort',
      },
    ],
  },
];

export const symptomDurationOptions: Array<{
  id: SymptomDuration;
  label: string;
  detail: string;
}> = [
  {
    id: 'under-1-hour',
    label: 'Under 1 hour',
    detail: 'Short flare-up',
  },
  {
    id: '1-3-hours',
    label: '1-3 hours',
    detail: 'Part of the workday',
  },
  {
    id: 'most-of-day',
    label: 'Most of today',
    detail: 'Stayed with you for much of the day',
  },
  {
    id: 'several-days',
    label: 'Several days',
    detail: 'Not new today',
  },
];

export const symptomSeverityScale: Array<{
  value: SymptomSeverity;
  label: string;
}> = [
  { value: 1, label: 'Very mild' },
  { value: 2, label: 'Mild' },
  { value: 3, label: 'Noticeable' },
  { value: 4, label: 'Strong' },
  { value: 5, label: 'Severe' },
];

export function getSymptomSeverityLabel(severity: SymptomSeverity) {
  return (
    symptomSeverityScale.find((entry) => entry.value === severity)?.label ??
    'Unknown'
  );
}

export function getSymptomDurationLabel(duration: SymptomDuration) {
  return (
    symptomDurationOptions.find((entry) => entry.id === duration)?.label ??
    duration
  );
}

export function getPresetSymptomLabel(symptomId: PresetSymptomId) {
  for (const group of symptomPresetGroups) {
    const item = group.items.find((entry) => entry.id === symptomId);

    if (item) {
      return item.label;
    }
  }

  return symptomId;
}
