import {
  buildSymptomSummary,
  buildSymptomTrendPoints,
  filterSymptomCheckInsToRecentDays,
} from '@/core/symptoms/symptom-history';
import type { SymptomCheckIn } from '@/types/domain';

describe('symptom history selectors', () => {
  const symptomCheckIns: SymptomCheckIn[] = [
    {
      id: 'check-in-1',
      createdAt: new Date('2026-04-05T09:00:00').getTime(),
      dateKey: '2026-04-05',
      source: 'manual',
      presetSymptoms: ['eye-strain', 'headache'],
      customSymptoms: ['Jaw tension'],
      severity: 3,
      duration: '1-3-hours',
      interferedWithWork: false,
    },
    {
      id: 'check-in-2',
      createdAt: new Date('2026-04-07T13:00:00').getTime(),
      dateKey: '2026-04-07',
      source: 'daily-reminder',
      presetSymptoms: ['eye-strain', 'reduced-focus'],
      customSymptoms: [],
      severity: 4,
      duration: 'most-of-day',
      interferedWithWork: true,
    },
    {
      id: 'check-in-3',
      createdAt: new Date('2026-04-08T16:30:00').getTime(),
      dateKey: '2026-04-08',
      source: 'manual',
      presetSymptoms: ['neck-pain-or-stiffness'],
      customSymptoms: ['Jaw tension'],
      severity: 2,
      duration: 'under-1-hour',
      interferedWithWork: false,
    },
  ];

  it('builds a descriptive symptom summary from local check-ins', () => {
    const summary = buildSymptomSummary(symptomCheckIns);

    expect(summary).toMatchObject({
      checkInCount: 3,
      symptomFrequency: 7,
      averageSeverity: 3,
      workInterferenceCount: 1,
      uniqueSymptomCount: 5,
      lastReportedAt: new Date('2026-04-08T16:30:00').getTime(),
    });
    expect(summary.mostCommonSymptoms[0]).toMatchObject({
      label: 'Jaw tension',
      count: 2,
      averageSeverity: 2.5,
    });
    expect(summary.mostCommonSymptoms[1]).toMatchObject({
      label: 'Eye strain',
      count: 2,
      averageSeverity: 3.5,
    });
    expect(summary.mostCommonSymptoms[2]).toMatchObject({
      label: 'Neck pain or stiffness',
      count: 1,
      averageSeverity: 2,
    });
  });

  it('filters check-ins to a recent local-day window and builds trend points', () => {
    const recentCheckIns = filterSymptomCheckInsToRecentDays(
      symptomCheckIns,
      2,
      new Date('2026-04-08T12:00:00Z'),
    );
    const trendPoints = buildSymptomTrendPoints(
      recentCheckIns,
      3,
      new Date('2026-04-08T12:00:00Z'),
    );

    expect(recentCheckIns.map((entry) => entry.dateKey)).toEqual([
      '2026-04-07',
      '2026-04-08',
    ]);
    expect(trendPoints).toEqual([
      expect.objectContaining({
        dateKey: '2026-04-06',
        checkInCount: 0,
        averageSeverity: 0,
        symptomFrequency: 0,
      }),
      expect.objectContaining({
        dateKey: '2026-04-07',
        checkInCount: 1,
        averageSeverity: 4,
        workInterferenceCount: 1,
        symptomFrequency: 2,
      }),
      expect.objectContaining({
        dateKey: '2026-04-08',
        checkInCount: 1,
        averageSeverity: 2,
        workInterferenceCount: 0,
        symptomFrequency: 2,
      }),
    ]);
  });
});
