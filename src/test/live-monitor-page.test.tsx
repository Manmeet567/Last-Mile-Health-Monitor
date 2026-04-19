import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const hookMocks = vi.hoisted(() => ({
  useAppSettings: vi.fn(),
  useCalibrationProfile: vi.fn(),
  useCamera: vi.fn(),
  useDashboardData: vi.fn(),
  useLiveMetrics: vi.fn(),
  useLivePostureState: vi.fn(),
  useMonitoringSession: vi.fn(),
  usePoseStream: vi.fn(),
  useReminders: vi.fn(),
}));

vi.mock('@/hooks/useAppSettings', () => ({
  useAppSettings: hookMocks.useAppSettings,
}));

vi.mock('@/hooks/useCalibrationProfile', () => ({
  useCalibrationProfile: hookMocks.useCalibrationProfile,
}));

vi.mock('@/hooks/useCamera', () => ({
  useCamera: hookMocks.useCamera,
}));

vi.mock('@/hooks/useDashboardData', () => ({
  useDashboardData: hookMocks.useDashboardData,
}));

vi.mock('@/hooks/useLiveMetrics', () => ({
  useLiveMetrics: hookMocks.useLiveMetrics,
}));

vi.mock('@/hooks/useLivePostureState', () => ({
  useLivePostureState: hookMocks.useLivePostureState,
}));

vi.mock('@/hooks/useMonitoringSession', () => ({
  useMonitoringSession: hookMocks.useMonitoringSession,
}));

vi.mock('@/hooks/usePoseStream', () => ({
  usePoseStream: hookMocks.usePoseStream,
}));

vi.mock('@/hooks/useReminders', () => ({
  useReminders: hookMocks.useReminders,
}));

import { LiveMonitorPage } from '@/pages/live-monitor/live-monitor-page';

describe('LiveMonitorPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    hookMocks.useCamera.mockReturnValue({
      devices: [],
      error: null,
      isSupported: true,
      selectedDeviceId: '',
      status: 'idle',
      stream: null,
      videoRef: { current: null },
      startCamera: vi.fn(),
      stopCamera: vi.fn(),
      changeCamera: vi.fn(),
    });

    hookMocks.useAppSettings.mockReturnValue({
      settings: {
        reminderSettings: {
          enabled: true,
          minimumSittingBeforeReminderMin: 30,
          slouchThresholdBeforeReminderSec: 120,
          reminderCooldownMin: 15,
        },
      },
    });

    hookMocks.useCalibrationProfile.mockReturnValue({
      profile: null,
    });

    hookMocks.useDashboardData.mockReturnValue({
      isLoading: false,
      trendPoints: [],
      postureDistribution: [],
      summary: {
        totalMonitoringSec: 0,
        postureQualityPct: 0,
        totalBreaks: 0,
        longestSittingBoutSec: 0,
        trackedDays: 0,
        remindersTriggered: 0,
      },
      recentSessions: [],
      latestCompletedSession: null,
      eventFeed: [],
      symptomSummary: {
        totalCheckIns: 0,
        averageSeverity: null,
        mostCommonSymptoms: [],
        workInterferenceCount: 0,
        latestCheckInAt: null,
        symptomFrequency: [],
      },
      latestDailyOverview: null,
    });

    hookMocks.usePoseStream.mockReturnValue({
      latestPose: null,
      workerDisplayState: {
        workerLabel: 'Worker: ready',
        backendLabel: 'Backend: wasm',
        tone: 'good',
      },
      workerState: {
        lifecycle: 'ready',
        phase: 'READY',
        backend: 'wasm',
        error: null,
        modelName: 'MoveNet',
        lastUpdatedAt: 1_000,
      },
    });

    hookMocks.useLiveMetrics.mockReturnValue({
      processedPose: {
        features: {
          timestamp: 5_000,
          trunkAngleDeg: 2,
          headForwardOffset: 0.04,
          earShoulderOffsetRatio: 0.3,
          headForwardRatio: 0.05,
          torsoLeanRatio: 0.03,
          shoulderTiltDeg: 0.5,
          shoulderProtractionProxy: 0.96,
          shoulderCompressionRatio: 0.04,
          shoulderAsymmetryRatio: 0.01,
          movementMagnitude: 0.01,
          isConfidenceSufficient: true,
        },
        stability: {
          signalQuality: 'reliable',
        },
        frameQuality: {
          state: 'GOOD',
          score: 0.94,
          hasHeadAndShoulders: true,
          hasTorsoContext: true,
          isCentered: true,
          usableForClassification: true,
          cautiousClassification: false,
          guidanceMessage: null,
        },
      },
    });

    hookMocks.useLivePostureState.mockReturnValue({
      state: 'DETECTING',
      candidateState: 'MILD_SLOUCH',
      stateDurationMs: 1_200,
      reason: 'Signal is still settling.',
      snapshot: {},
      displayState: 'GOOD_POSTURE',
      displayStateDurationMs: 4_200,
      displayReason: 'Holding the last stable posture while the signal settles.',
      displaySnapshot: {},
    });

    hookMocks.useMonitoringSession.mockReturnValue({
      activeSession: {
        id: 'session-1',
        totalDurationSec: 305,
        breakCount: 2,
      },
      latestCompletedSession: null,
    });

    hookMocks.useReminders.mockReturnValue({
      activeReminder: null,
      dismissReminder: vi.fn(),
      contextSnapshot: {
        sittingBoutDurationSec: 180,
        slouchDurationSec: 45,
        mildSlouchDurationSec: 45,
        deepSlouchDurationSec: 0,
        awayDurationSec: 0,
        timeSinceLastBreakSec: null,
        lastReminderAt: null,
      },
      sessionMetrics: {
        totalSessionDurationSec: 305,
        totalGoodPostureSec: 220,
        totalSlouchSec: 45,
        breakCount: 1,
        nudgeCount: 2,
        goodPosturePercent: 72,
        longestSlouchStreakSec: 38,
        currentState: 'GOOD_POSTURE',
        currentStateDurationSec: 4,
      },
      sessionSummary: {
        durationMs: 305_000,
        goodPostureMs: 220_000,
        slouchMs: 45_000,
        breakCount: 1,
        nudgeCount: 2,
        longestSlouchStreakMs: 38_000,
        goodPosturePercent: 72,
        sessionScoreLabel: 'Good',
        insights: ['Great job maintaining good posture this session.'],
        reflectionLine: 'You stayed consistent through most of this session.',
        recoverySuggestion:
          'A light reset can help the next session start just as smoothly.',
      },
      sessionEndAt: null,
      sessionEligible: true,
    });
  });

  it('uses the stabilized display state in the main UI while exposing runtime states in advanced details', () => {
    render(
      <MemoryRouter initialEntries={['/live-monitor?mode=live']}>
        <Routes>
          <Route path="/live-monitor" element={<LiveMonitorPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getAllByText(/Good posture/i).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByText(/Advanced details/i));

    expect(screen.getByText('Displayed state')).toBeInTheDocument();
    expect(screen.getByText('Runtime state')).toBeInTheDocument();
    expect(screen.getByText('Candidate state')).toBeInTheDocument();
    expect(screen.getByText('GOOD_POSTURE')).toBeInTheDocument();
    expect(screen.getByText('DETECTING')).toBeInTheDocument();
    expect(screen.getByText('MILD_SLOUCH')).toBeInTheDocument();
    expect(
      screen.getByText('You stayed consistent through most of this session.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'A light reset can help the next session start just as smoothly.',
      ),
    ).toBeInTheDocument();
  });

  it('renders the inline nudge banner below the camera when a nudge is active', () => {
    hookMocks.useReminders.mockReturnValue({
      activeReminder: {
        id: 'reminder-posture-1',
        type: 'POSTURE_NUDGE',
        title: 'Posture reminder',
        message: 'Sit a little taller',
        cooldownExpiresAt: 91_000,
        priority: 1,
        context: {
          currentState: 'MILD_SLOUCH',
          sittingBoutDurationSec: 120,
          slouchDurationSec: 28,
          timeSinceLastBreakSec: null,
        },
        triggeredAt: 1_000,
        severity: 'soft',
      },
      dismissReminder: vi.fn(),
      contextSnapshot: {
        sittingBoutDurationSec: 180,
        slouchDurationSec: 45,
        mildSlouchDurationSec: 45,
        deepSlouchDurationSec: 0,
        awayDurationSec: 0,
        timeSinceLastBreakSec: null,
        lastReminderAt: 1_000,
      },
      sessionMetrics: {
        totalSessionDurationSec: 305,
        totalGoodPostureSec: 220,
        totalSlouchSec: 45,
        breakCount: 1,
        nudgeCount: 2,
        goodPosturePercent: 72,
        longestSlouchStreakSec: 38,
        currentState: 'GOOD_POSTURE',
        currentStateDurationSec: 4,
      },
      sessionSummary: {
        durationMs: 305_000,
        goodPostureMs: 220_000,
        slouchMs: 45_000,
        breakCount: 1,
        nudgeCount: 2,
        longestSlouchStreakMs: 38_000,
        goodPosturePercent: 72,
        sessionScoreLabel: 'Good',
        insights: ['Great job maintaining good posture this session.'],
        reflectionLine: 'You stayed consistent through most of this session.',
        recoverySuggestion:
          'A light reset can help the next session start just as smoothly.',
      },
      sessionEndAt: null,
      sessionEligible: true,
    });

    render(
      <MemoryRouter initialEntries={['/live-monitor?mode=live']}>
        <Routes>
          <Route path="/live-monitor" element={<LiveMonitorPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Sit a little taller')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Dismiss/i })).toBeInTheDocument();
  });
});
