import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { PrivacyPage } from '@/pages/privacy/privacy-page';
import { usePrivacyControls } from '@/hooks/usePrivacyControls';

vi.mock('@/hooks/usePrivacyControls', () => ({
  usePrivacyControls: vi.fn(),
}));

const mockedUsePrivacyControls = vi.mocked(usePrivacyControls);

function createPrivacyControlsMock() {
  return {
    snapshot: {
      settingsCount: 1,
      calibrationProfilesCount: 2,
      sessionsCount: 3,
      completedSessionsCount: 2,
      eventsCount: 6,
      dailyMetricsCount: 4,
      sessionSamplesCount: 0,
      latestCompletedSessionAt: new Date('2026-04-08T10:30:00').getTime(),
      latestEventAt: new Date('2026-04-08T11:00:00').getTime(),
    },
    runtimeStatus: {
      isOnline: false,
      isStandalone: true,
      serviceWorkerSupported: true,
      storageEstimateBytes: 2048,
      storageQuotaBytes: 8 * 1024 * 1024,
    },
    isLoading: false,
    activeAction: null,
    message: null,
    error: null,
    refresh: vi.fn(),
    exportJson: vi.fn().mockResolvedValue(undefined),
    clearHistory: vi.fn().mockResolvedValue(undefined),
    resetCalibration: vi.fn().mockResolvedValue(undefined),
    resetSettings: vi.fn().mockResolvedValue(undefined),
    clearAll: vi.fn().mockResolvedValue(undefined),
  };
}

describe('PrivacyPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders local data counts and runtime status from the privacy hook', () => {
    mockedUsePrivacyControls.mockReturnValue(createPrivacyControlsMock());

    render(
      <MemoryRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <PrivacyPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: /privacy and local data controls/i })).toBeInTheDocument();
    expect(screen.getByText('Settings records')).toBeInTheDocument();
    expect(screen.getByText('Calibration profiles')).toBeInTheDocument();
    expect(screen.getByText('Completed sessions')).toBeInTheDocument();
    expect(screen.getByText('Offline')).toBeInTheDocument();
    expect(screen.getByText('Standalone')).toBeInTheDocument();
    expect(screen.getByText('2.0 KB')).toBeInTheDocument();
    expect(screen.getByText('8.0 MB')).toBeInTheDocument();
  });

  it('runs export, refresh, and reset actions through the privacy hook', async () => {
    const user = userEvent.setup();
    const privacyControls = createPrivacyControlsMock();
    mockedUsePrivacyControls.mockReturnValue(privacyControls);
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(
      <MemoryRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <PrivacyPage />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: /refresh local status/i }));
    await user.click(screen.getByRole('button', { name: /export json/i }));
    await user.click(screen.getByRole('button', { name: /reset calibration/i }));
    await user.click(screen.getByRole('button', { name: /clear history/i }));
    await user.click(screen.getByRole('button', { name: /clear everything/i }));

    expect(privacyControls.refresh).toHaveBeenCalledTimes(1);
    expect(privacyControls.exportJson).toHaveBeenCalledTimes(1);
    expect(privacyControls.resetCalibration).toHaveBeenCalledTimes(1);
    expect(privacyControls.clearHistory).toHaveBeenCalledTimes(1);
    expect(privacyControls.clearAll).toHaveBeenCalledTimes(1);
  });
});
