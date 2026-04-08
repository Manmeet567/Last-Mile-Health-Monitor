import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { SettingsPage } from '@/pages/settings/settings-page';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useCalibrationProfile } from '@/hooks/useCalibrationProfile';

vi.mock('@/hooks/useAppSettings', () => ({
  useAppSettings: vi.fn(),
}));

vi.mock('@/hooks/useCalibrationProfile', () => ({
  useCalibrationProfile: vi.fn(),
}));

const mockedUseAppSettings = vi.mocked(useAppSettings);
const mockedUseCalibrationProfile = vi.mocked(useCalibrationProfile);

function createAppSettingsMock() {
  return {
    settings: {
      targetInferenceFps: 12,
      preferredModelVariant: 'lightning' as const,
      theme: 'system' as const,
      privacyMode: 'strict' as const,
      reminderSettings: {
        enabled: true,
        minimumSittingBeforeReminderMin: 45,
        slouchThresholdBeforeReminderSec: 180,
        reminderCooldownMin: 20,
        workingHoursStart: '09:00',
        workingHoursEnd: '18:00',
      },
    },
    isLoading: false,
    error: null,
    refresh: vi.fn(),
    save: vi.fn(),
    saveReminderSettings: vi.fn().mockResolvedValue(undefined),
  };
}

describe('SettingsPage', () => {
  it('renders saved values and quick links based on settings and calibration state', () => {
    mockedUseAppSettings.mockReturnValue(createAppSettingsMock());
    mockedUseCalibrationProfile.mockReturnValue({
      profile: {
        id: 'calibration-1',
        createdAt: 1,
        updatedAt: 2,
        baselineTrunkAngle: 2,
        baselineHeadOffset: 0.1,
        baselineShoulderLevelDelta: 0.1,
        torsoLength: 100,
        preferredSensitivity: 'medium',
        confidenceThreshold: 0.6,
        mildSlouchThreshold: 8,
        deepSlouchThreshold: 14,
        headOffsetWarningThreshold: 0.2,
        shoulderTiltWarningThreshold: 4,
        sampleCount: 40,
      },
      isLoading: false,
      refresh: vi.fn(),
      save: vi.fn(),
      clear: vi.fn(),
    });

    render(
      <MemoryRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <SettingsPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: /settings now cover reminders/i })).toBeInTheDocument();
    expect(screen.getByText(/a saved calibration profile is available/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open onboarding/i })).toHaveAttribute('href', '/onboarding');
    expect(screen.getByRole('link', { name: /privacy controls/i })).toHaveAttribute('href', '/privacy');
    expect(screen.getByText(/break reminder: 45 min/i)).toBeInTheDocument();
  });

  it('submits edited reminder settings through the settings hook', async () => {
    const user = userEvent.setup();
    const appSettings = createAppSettingsMock();
    mockedUseAppSettings.mockReturnValue(appSettings);
    mockedUseCalibrationProfile.mockReturnValue({
      profile: null,
      isLoading: false,
      refresh: vi.fn(),
      save: vi.fn(),
      clear: vi.fn(),
    });

    render(
      <MemoryRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <SettingsPage />
      </MemoryRouter>,
    );

    const breakReminderInput = screen.getByLabelText(/break reminder/i);
    const postureThresholdInput = screen.getByLabelText(/posture threshold/i);
    const cooldownInput = screen.getByLabelText(/cooldown/i);

    await user.clear(breakReminderInput);
    await user.type(breakReminderInput, '60');
    await user.clear(postureThresholdInput);
    await user.type(postureThresholdInput, '240');
    await user.clear(cooldownInput);
    await user.type(cooldownInput, '30');
    await user.click(screen.getByRole('button', { name: /save reminder settings/i }));

    await waitFor(() => {
      expect(appSettings.saveReminderSettings).toHaveBeenCalledWith({
        enabled: true,
        minimumSittingBeforeReminderMin: 60,
        slouchThresholdBeforeReminderSec: 240,
        reminderCooldownMin: 30,
        workingHoursStart: '09:00',
        workingHoursEnd: '18:00',
      });
    });

    expect(screen.getByText(/reminder preferences saved locally/i)).toBeInTheDocument();
  });
});
