import { fireEvent, render, screen } from '@testing-library/react';
import { HistoryInsightsTabs } from '@/components/history/history-page-sections';

describe('HistoryInsightsTabs', () => {
  it('shows persisted session labels and insight previews in the sessions tab', () => {
    render(
      <HistoryInsightsTabs
        eventFeed={[]}
        isLoading={false}
        postureDistribution={[]}
        recentSessions={[
          {
            id: 'session-1',
            startedAt: new Date('2026-04-18T09:00:00Z').getTime(),
            endedAt: new Date('2026-04-18T09:45:00Z').getTime(),
            totalDurationSec: 2_700,
            durationMs: 2_700_000,
            activeMonitoringSec: 2_700,
            sittingSec: 2_300,
            goodPostureSec: 1_700,
            goodPostureMs: 1_700_000,
            mildSlouchSec: 420,
            deepSlouchSec: 180,
            slouchMs: 600_000,
            movingSec: 0,
            awaySec: 0,
            breakCount: 1,
            nudgeCount: 2,
            longestSlouchStreakMs: 90_000,
            goodPosturePercent: 74,
            sessionScoreLabel: 'Good',
            insights: ['Great job maintaining good posture this session.'],
            longestSittingBoutSec: 1_200,
            sittingBoutCount: 2,
          },
        ]}
        symptomSummary={{
          checkInCount: 0,
          symptomFrequency: 0,
          uniqueSymptomCount: 0,
          averageSeverity: 0,
          workInterferenceCount: 0,
          lastReportedAt: null,
          mostCommonSymptoms: [],
          symptomStats: [],
        }}
        symptomTrendPoints={[]}
        trendPoints={[]}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Sessions' }));

    expect(screen.getByText('Good')).toBeInTheDocument();
    expect(
      screen.getByText('Great job maintaining good posture this session.'),
    ).toBeInTheDocument();
  });
});
