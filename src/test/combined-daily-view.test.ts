import {
  buildAllCombinedDailyOverviews,
  buildCombinedDailyOverviews,
  filterCombinedDailyOverviews,
  getCombinedDailyPostureFilterOptions,
  getCombinedDailySymptomOptions,
} from '@/core/history/combined-daily-view';
import type { DailyMetrics, SymptomCheckIn } from '@/types/domain';

describe('combined daily view selectors', () => {
  it('aligns posture rollups and symptom check-ins by local date key', () => {
    const metrics: DailyMetrics[] = [
      {
        dateKey: '2026-04-06',
        totalMonitoringSec: 2400,
        totalSittingSec: 1800,
        goodPostureSec: 900,
        mildSlouchSec: 600,
        deepSlouchSec: 300,
        totalBreaks: 2,
        longestSittingBoutSec: 900,
        averageSittingBoutSec: 450,
        remindersTriggered: 1,
        sittingBoutCount: 4,
      },
      {
        dateKey: '2026-04-07',
        totalMonitoringSec: 3600,
        totalSittingSec: 2400,
        goodPostureSec: 1200,
        mildSlouchSec: 900,
        deepSlouchSec: 300,
        totalBreaks: 3,
        longestSittingBoutSec: 1200,
        averageSittingBoutSec: 600,
        remindersTriggered: 2,
        sittingBoutCount: 4,
      },
    ];
    const checkIns: SymptomCheckIn[] = [
      {
        id: 'check-in-1',
        createdAt: new Date('2026-04-07T13:00:00').getTime(),
        dateKey: '2026-04-07',
        source: 'manual',
        presetSymptoms: ['eye-strain', 'headache'],
        customSymptoms: ['Jaw tension'],
        severity: 4,
        duration: 'most-of-day',
        interferedWithWork: true,
      },
      {
        id: 'check-in-2',
        createdAt: new Date('2026-04-08T09:30:00').getTime(),
        dateKey: '2026-04-08',
        source: 'daily-reminder',
        presetSymptoms: ['neck-pain-or-stiffness'],
        customSymptoms: [],
        severity: 2,
        duration: 'under-1-hour',
        interferedWithWork: false,
      },
    ];

    const overviews = buildCombinedDailyOverviews(
      metrics,
      checkIns,
      3,
      new Date('2026-04-08T12:00:00Z'),
    );

    expect(overviews.map((entry) => entry.dateKey)).toEqual([
      '2026-04-08',
      '2026-04-07',
      '2026-04-06',
    ]);
    expect(overviews[0]).toMatchObject({
      dateKey: '2026-04-08',
      hasPostureData: false,
      hasSymptomData: true,
      symptomCheckInCount: 1,
      averageSymptomSeverity: 2,
      workInterferenceReported: false,
      symptomsReported: ['Neck pain or stiffness'],
    });
    expect(overviews[1]).toMatchObject({
      dateKey: '2026-04-07',
      hasPostureData: true,
      hasSymptomData: true,
      postureQualityPct: 50,
      totalBreaks: 3,
      remindersTriggered: 2,
      symptomCheckInCount: 1,
      averageSymptomSeverity: 4,
      workInterferenceReported: true,
      dominantPostureLabel: 'Good posture',
    });
    expect(overviews[2]).toMatchObject({
      dateKey: '2026-04-06',
      hasPostureData: true,
      hasSymptomData: false,
      totalBreaks: 2,
      symptomsReported: [],
    });
  });

  it('builds all-time overviews and filters them descriptively', () => {
    const metrics: DailyMetrics[] = [
      {
        dateKey: '2026-03-12',
        totalMonitoringSec: 1800,
        totalSittingSec: 1200,
        goodPostureSec: 300,
        mildSlouchSec: 300,
        deepSlouchSec: 600,
        totalBreaks: 1,
        longestSittingBoutSec: 600,
        averageSittingBoutSec: 600,
        remindersTriggered: 2,
        sittingBoutCount: 2,
      },
      {
        dateKey: '2026-04-08',
        totalMonitoringSec: 3600,
        totalSittingSec: 2400,
        goodPostureSec: 1800,
        mildSlouchSec: 400,
        deepSlouchSec: 200,
        totalBreaks: 3,
        longestSittingBoutSec: 1200,
        averageSittingBoutSec: 600,
        remindersTriggered: 1,
        sittingBoutCount: 4,
      },
    ];
    const checkIns: SymptomCheckIn[] = [
      {
        id: 'check-in-1',
        createdAt: new Date('2026-04-08T09:30:00').getTime(),
        dateKey: '2026-04-08',
        source: 'manual',
        presetSymptoms: ['eye-strain'],
        customSymptoms: ['Jaw tension'],
        severity: 4,
        duration: 'most-of-day',
        interferedWithWork: true,
      },
      {
        id: 'check-in-2',
        createdAt: new Date('2026-03-12T11:00:00').getTime(),
        dateKey: '2026-03-12',
        source: 'daily-reminder',
        presetSymptoms: ['neck-pain-or-stiffness'],
        customSymptoms: [],
        severity: 2,
        duration: '1-3-hours',
        interferedWithWork: false,
      },
    ];

    const overviews = buildAllCombinedDailyOverviews(metrics, checkIns);

    expect(overviews.map((entry) => entry.dateKey)).toEqual([
      '2026-04-08',
      '2026-03-12',
    ]);
    expect(getCombinedDailySymptomOptions(overviews)).toEqual([
      'Eye strain',
      'Jaw tension',
      'Neck pain or stiffness',
    ]);
    expect(getCombinedDailyPostureFilterOptions(overviews)).toEqual([
      'Good posture',
      'Mild slouch',
      'Deep slouch',
    ]);

    const filteredBySymptom = filterCombinedDailyOverviews(
      overviews,
      {
        dateRange: 'all',
        symptomLabel: 'Eye strain',
        onlyDaysWithSymptoms: false,
        postureStateLabel: null,
      },
      new Date('2026-04-08T12:00:00Z'),
    );
    const filteredByPosture = filterCombinedDailyOverviews(
      overviews,
      {
        dateRange: 'all',
        symptomLabel: null,
        onlyDaysWithSymptoms: false,
        postureStateLabel: 'Deep slouch',
      },
      new Date('2026-04-08T12:00:00Z'),
    );
    const filteredByRecentWindow = filterCombinedDailyOverviews(
      overviews,
      {
        dateRange: '14d',
        symptomLabel: null,
        onlyDaysWithSymptoms: true,
        postureStateLabel: 'Good posture',
      },
      new Date('2026-04-08T12:00:00Z'),
    );

    expect(filteredBySymptom.map((entry) => entry.dateKey)).toEqual([
      '2026-04-08',
    ]);
    expect(filteredByPosture.map((entry) => entry.dateKey)).toEqual([
      '2026-04-08',
      '2026-03-12',
    ]);
    expect(filteredByRecentWindow.map((entry) => entry.dateKey)).toEqual([
      '2026-04-08',
    ]);
  });
});
