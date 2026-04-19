import {
  areCombinedHistoryFiltersEqual,
  defaultCombinedHistoryFilters,
  sanitizeCombinedHistoryFilters,
} from '@/core/history/history-filter-persistence';

describe('history filter persistence helpers', () => {
  it('sanitizes stale symptom and posture filters back to safe values', () => {
    const sanitized = sanitizeCombinedHistoryFilters(
      {
        dateRange: 'all',
        symptomLabel: 'Old symptom',
        onlyDaysWithSymptoms: true,
        postureStateLabel: 'Deep slouch',
      },
      ['Eye strain'],
      ['Good posture'],
    );

    expect(sanitized).toEqual({
      dateRange: 'all',
      symptomLabel: null,
      onlyDaysWithSymptoms: true,
      postureStateLabel: null,
    });
    expect(
      areCombinedHistoryFiltersEqual(
        sanitized,
        defaultCombinedHistoryFilters,
      ),
    ).toBe(false);
  });

  it('preserves option-based filters while history data is still loading', () => {
    const sanitized = sanitizeCombinedHistoryFilters(
      {
        dateRange: 'all',
        symptomLabel: 'Eye strain',
        onlyDaysWithSymptoms: true,
        postureStateLabel: 'Deep slouch',
      },
      [],
      [],
      { preserveOptionFilters: true },
    );

    expect(sanitized).toEqual({
      dateRange: 'all',
      symptomLabel: 'Eye strain',
      onlyDaysWithSymptoms: true,
      postureStateLabel: 'Deep slouch',
    });
  });
});
