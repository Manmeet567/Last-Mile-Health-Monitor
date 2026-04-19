import {
  buildSymptomCheckIn,
  normalizeCustomSymptomLabels,
  normalizeSymptomLabel,
  symptomSelectionCount,
} from '@/core/symptoms/symptom-check-ins';

describe('symptom check-in helpers', () => {
  it('normalizes and de-duplicates custom symptom labels', () => {
    expect(
      normalizeCustomSymptomLabels([
        '  Wrist tightness  ',
        'wrist   tightness',
        ' Eye fatigue',
        '',
      ]),
    ).toEqual(['Eye fatigue', 'Wrist tightness']);
  });

  it('builds a local-day symptom check-in record', () => {
    const createdAt = new Date(2026, 3, 16, 9, 30, 0, 0).getTime();
    const checkIn = buildSymptomCheckIn({
      createdAt,
      source: 'daily-reminder',
      presetSymptoms: ['eye-strain', 'headache', 'eye-strain'],
      customSymptoms: ['  Jaw tension ', 'jaw tension'],
      severity: 4,
      duration: 'most-of-day',
      interferedWithWork: true,
    });

    expect(normalizeSymptomLabel('  Neck strain   ')).toBe('Neck strain');
    expect(checkIn).toMatchObject({
      id: `symptom-check-in-${createdAt}`,
      createdAt,
      dateKey: '2026-04-16',
      source: 'daily-reminder',
      presetSymptoms: ['eye-strain', 'headache'],
      customSymptoms: ['Jaw tension'],
      severity: 4,
      duration: 'most-of-day',
      interferedWithWork: true,
    });
    expect(symptomSelectionCount(checkIn)).toBe(3);
  });
});
