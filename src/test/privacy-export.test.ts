import {
  createPrivacyExportDocument,
  formatBytes,
  formatPrivacyExportFileName,
} from '@/core/privacy/privacy-export';

describe('privacy export helpers', () => {
  it('builds a structured local export document with record counts', () => {
    const document = createPrivacyExportDocument({
      exportedAt: 1_712_566_400_000,
      settings: {
        reminderSettings: {
          enabled: true,
          minimumSittingBeforeReminderMin: 45,
          slouchThresholdBeforeReminderSec: 180,
          reminderCooldownMin: 20,
        },
      },
      calibrationProfiles: [
        {
          id: 'calibration-1',
          createdAt: 1,
          updatedAt: 2,
          baselineTrunkAngle: 2,
          baselineHeadOffset: 0.1,
          torsoLength: 100,
          preferredSensitivity: 'medium',
          mildSlouchThreshold: 8,
          deepSlouchThreshold: 14,
          headOffsetWarningThreshold: 0.2,
          sampleCount: 40,
        },
      ],
      sessions: [
        {
          id: 'session-1',
          startedAt: 1,
          endedAt: 120,
          totalDurationSec: 119,
          activeMonitoringSec: 110,
          sittingSec: 100,
          goodPostureSec: 75,
          mildSlouchSec: 20,
          deepSlouchSec: 5,
          movingSec: 0,
          awaySec: 10,
          breakCount: 1,
          longestSittingBoutSec: 90,
          sittingBoutCount: 1,
        },
      ],
      dailyMetrics: [
        {
          dateKey: '2026-04-08',
          totalMonitoringSec: 119,
          totalSittingSec: 100,
          goodPostureSec: 75,
          mildSlouchSec: 20,
          deepSlouchSec: 5,
          totalBreaks: 1,
          longestSittingBoutSec: 90,
          averageSittingBoutSec: 90,
          remindersTriggered: 1,
          sittingBoutCount: 1,
        },
      ],
      events: [
        {
          id: 'event-1',
          type: 'REMINDER_TRIGGERED',
          timestamp: 80,
        },
      ],
      symptomCheckIns: [
        {
          id: 'symptom-1',
          createdAt: 81,
          dateKey: '2026-04-08',
          source: 'manual',
          presetSymptoms: ['headache'],
          customSymptoms: ['Jaw tension'],
          severity: 3,
          duration: '1-3-hours',
          interferedWithWork: false,
        },
      ],
      savedCustomSymptoms: [
        {
          id: 'custom-1',
          label: 'Jaw tension',
          createdAt: 70,
        },
      ],
    });

    expect(document.meta).toMatchObject({
      schemaVersion: 3,
      privacyMode: 'local-only',
      recordCounts: {
        settings: 1,
        calibrationProfiles: 1,
        sessions: 1,
        dailyMetrics: 1,
        events: 1,
        symptomCheckIns: 1,
        savedCustomSymptoms: 1,
      },
    });
    expect(document.sessions).toHaveLength(1);
    expect(document.symptomCheckIns).toHaveLength(1);
    expect(
      document.settings?.reminderSettings.minimumSittingBeforeReminderMin,
    ).toBe(45);
  });

  it('formats export filenames and storage sizes for the privacy UI', () => {
    expect(
      formatPrivacyExportFileName(new Date('2026-04-08T10:45:00').getTime()),
    ).toBe('last-mile-local-data-20260408-1045.json');
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2.0 KB');
    expect(formatBytes(3 * 1024 * 1024)).toBe('3.0 MB');
    expect(formatBytes(null)).toBe('Unavailable');
  });
});
