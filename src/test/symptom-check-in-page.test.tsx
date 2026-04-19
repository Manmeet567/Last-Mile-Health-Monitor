import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { SymptomCheckInPage } from '@/pages/symptom-check-in/symptom-check-in-page';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useSymptomCheckIns } from '@/hooks/useSymptomCheckIns';

vi.mock('@/hooks/useDashboardData', () => ({
  useDashboardData: vi.fn(),
}));

vi.mock('@/hooks/useSymptomCheckIns', () => ({
  useSymptomCheckIns: vi.fn(),
}));

const mockedUseDashboardData = vi.mocked(useDashboardData);
const mockedUseSymptomCheckIns = vi.mocked(useSymptomCheckIns);

function createSymptomCheckInsMock() {
  return {
    recentCheckIns: [],
    savedCustomSymptoms: [
      {
        id: 'custom-1',
        label: 'Jaw tension',
        createdAt: 1,
      },
    ],
    todayCheckIn: null,
    isLoading: false,
    isSaving: false,
    error: null,
    addCustomSymptom: vi.fn().mockResolvedValue({
      id: 'custom-2',
      label: 'Hip tightness',
      createdAt: 2,
    }),
    submitCheckIn: vi.fn().mockResolvedValue({
      id: 'check-in-1',
      createdAt: 1,
    }),
  };
}

describe('SymptomCheckInPage', () => {
  beforeEach(() => {
    mockedUseDashboardData.mockReturnValue({
      isLoading: false,
      trendPoints: [],
      postureDistribution: [],
      summary: {
        totalMonitoringSec: 0,
        totalSittingSec: 0,
        totalBreaks: 0,
        longestSittingBoutSec: 0,
        trackedDays: 0,
        postureQualityPct: 0,
        remindersTriggered: 0,
      },
      recentSessions: [],
      latestCompletedSession: null,
      eventFeed: [],
      symptomSummary: {
        checkInCount: 0,
        symptomFrequency: 0,
        averageSeverity: 0,
        workInterferenceCount: 0,
        lastReportedAt: null,
        uniqueSymptomCount: 0,
        mostCommonSymptoms: [],
        symptomStats: [],
      },
      latestDailyOverview: null,
    } as unknown as ReturnType<typeof useDashboardData>);
  });

  it(
    'submits a daily-reminder symptom check-in through the hook',
    async () => {
    const user = userEvent.setup();
    const symptomCheckIns = createSymptomCheckInsMock();
    mockedUseSymptomCheckIns.mockReturnValue(symptomCheckIns);

    render(
      <MemoryRouter
        initialEntries={['/symptom-check-in?source=daily-reminder']}
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <SymptomCheckInPage />
      </MemoryRouter>,
    );

    expect(screen.getByText(/reminder entry active/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /eye strain/i }));
    await user.click(screen.getByRole('button', { name: /jaw tension/i }));
    await user.click(screen.getByRole('button', { name: /continue/i }));
    await user.click(
      screen.getByRole('switch', { name: /yes, it affected my work/i }),
    );
    await user.click(screen.getByRole('button', { name: /most of today/i }));
    fireEvent.change(screen.getByLabelText(/severity/i), {
      target: { value: '4' },
    });
    await user.click(
      screen.getByRole('button', { name: /save symptom check-in/i }),
    );

    await waitFor(() => {
      expect(symptomCheckIns.submitCheckIn).toHaveBeenCalledWith({
        source: 'daily-reminder',
        presetSymptoms: ['eye-strain'],
        customSymptoms: ['Jaw tension'],
        severity: 4,
        duration: 'most-of-day',
        interferedWithWork: true,
      });
    });
    },
    15_000,
  );

  it(
    'adds a custom symptom label locally',
    async () => {
    const user = userEvent.setup();
    const symptomCheckIns = createSymptomCheckInsMock();
    mockedUseSymptomCheckIns.mockReturnValue(symptomCheckIns);

    render(
      <MemoryRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <SymptomCheckInPage />
      </MemoryRouter>,
    );

    await user.type(
      screen.getByPlaceholderText(/add a custom symptom/i),
      'Hip tightness',
    );
    await user.click(screen.getByRole('button', { name: /^add$/i }));

    await waitFor(() => {
      expect(symptomCheckIns.addCustomSymptom).toHaveBeenCalledWith(
        'Hip tightness',
      );
    });
    },
    15_000,
  );
});
