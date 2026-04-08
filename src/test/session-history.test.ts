import { getLatestCompletedSession, sortCompletedSessionsByEndedAtDesc } from '@/core/metrics/session-history';
import type { MonitoringSession } from '@/types/domain';

describe('session history helpers', () => {
  it('orders completed sessions by endedAt descending instead of startedAt', () => {
    const sessions: MonitoringSession[] = [
      {
        id: 'session-a',
        startedAt: 100,
        endedAt: 1_000,
        totalDurationSec: 900,
        activeMonitoringSec: 900,
        sittingSec: 800,
        goodPostureSec: 700,
        mildSlouchSec: 80,
        deepSlouchSec: 20,
        movingSec: 0,
        awaySec: 100,
        breakCount: 1,
        longestSittingBoutSec: 500,
        sittingBoutCount: 2,
      },
      {
        id: 'session-b',
        startedAt: 200,
        endedAt: 800,
        totalDurationSec: 600,
        activeMonitoringSec: 600,
        sittingSec: 500,
        goodPostureSec: 300,
        mildSlouchSec: 120,
        deepSlouchSec: 80,
        movingSec: 0,
        awaySec: 100,
        breakCount: 2,
        longestSittingBoutSec: 300,
        sittingBoutCount: 2,
      },
      {
        id: 'session-open',
        startedAt: 300,
        endedAt: null,
        totalDurationSec: 100,
        activeMonitoringSec: 100,
        sittingSec: 100,
        goodPostureSec: 100,
        mildSlouchSec: 0,
        deepSlouchSec: 0,
        movingSec: 0,
        awaySec: 0,
        breakCount: 0,
        longestSittingBoutSec: 100,
        sittingBoutCount: 1,
      },
    ];

    const orderedSessions = sortCompletedSessionsByEndedAtDesc(sessions);

    expect(orderedSessions.map((session) => session.id)).toEqual(['session-a', 'session-b']);
    expect(getLatestCompletedSession(sessions)?.id).toBe('session-a');
  });

  it('returns null when there is no completed session yet', () => {
    const sessions: MonitoringSession[] = [
      {
        id: 'session-open',
        startedAt: 300,
        endedAt: null,
        totalDurationSec: 100,
        activeMonitoringSec: 100,
        sittingSec: 100,
        goodPostureSec: 100,
        mildSlouchSec: 0,
        deepSlouchSec: 0,
        movingSec: 0,
        awaySec: 0,
        breakCount: 0,
        longestSittingBoutSec: 100,
        sittingBoutCount: 1,
      },
    ];

    expect(getLatestCompletedSession(sessions)).toBeNull();
  });
});
