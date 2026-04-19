import {
  advanceDisplayedPostureState,
  createInitialDisplayedPostureStateSnapshot,
} from '@/core/state-machine/displayed-posture-state';
import type { PostureStateSnapshot } from '@/core/state-machine/state-machine.types';

function createRuntimeSnapshot(overrides?: Partial<PostureStateSnapshot>): PostureStateSnapshot {
  return {
    state: 'GOOD_POSTURE',
    candidateState: 'GOOD_POSTURE',
    stateSince: 0,
    candidateSince: 0,
    reason: 'Stable posture.',
    emittedEvents: [],
    ...overrides,
  };
}

describe('displayed posture state', () => {
  it('holds the last displayed posture during a transient detecting dip', () => {
    const previousSnapshot = {
      ...createInitialDisplayedPostureStateSnapshot(0),
      state: 'GOOD_POSTURE' as const,
      stateSince: 0,
      reason: 'Stable posture.',
      rawState: 'GOOD_POSTURE' as const,
      rawCandidateState: 'GOOD_POSTURE' as const,
      pendingState: 'GOOD_POSTURE' as const,
      pendingSince: 0,
    };

    const nextSnapshot = advanceDisplayedPostureState({
      previousSnapshot,
      runtimeSnapshot: createRuntimeSnapshot({
        state: 'DETECTING',
        candidateState: 'DETECTING',
        stateSince: 400,
        candidateSince: 400,
        reason: 'Signal dipped.',
      }),
      timestamp: 900,
    });

    expect(nextSnapshot.state).toBe('GOOD_POSTURE');
    expect(nextSnapshot.rawState).toBe('DETECTING');
    expect(nextSnapshot.reason).toMatch(/holding/i);
  });

  it('commits the displayed posture once the runtime state stays changed long enough', () => {
    const previousSnapshot = {
      ...createInitialDisplayedPostureStateSnapshot(0),
      state: 'GOOD_POSTURE' as const,
      stateSince: 0,
      reason: 'Stable posture.',
      rawState: 'GOOD_POSTURE' as const,
      rawCandidateState: 'GOOD_POSTURE' as const,
      pendingState: 'GOOD_POSTURE' as const,
      pendingSince: 0,
    };

    const waitingSnapshot = advanceDisplayedPostureState({
      previousSnapshot,
      runtimeSnapshot: createRuntimeSnapshot({
        state: 'MILD_SLOUCH',
        candidateState: 'MILD_SLOUCH',
        stateSince: 0,
        candidateSince: 0,
        reason: 'Posture has dipped.',
      }),
      timestamp: 1_000,
    });

    expect(waitingSnapshot.state).toBe('GOOD_POSTURE');
    expect(waitingSnapshot.rawState).toBe('MILD_SLOUCH');
    expect(waitingSnapshot.pendingState).toBe('MILD_SLOUCH');
    expect(waitingSnapshot.reason).toMatch(/consistent/i);

    const nextSnapshot = advanceDisplayedPostureState({
      previousSnapshot: waitingSnapshot,
      runtimeSnapshot: createRuntimeSnapshot({
        state: 'MILD_SLOUCH',
        candidateState: 'MILD_SLOUCH',
        stateSince: 0,
        candidateSince: 0,
        reason: 'Posture has dipped.',
      }),
      timestamp: 1_500,
    });

    expect(nextSnapshot.state).toBe('MILD_SLOUCH');
    expect(nextSnapshot.rawState).toBe('MILD_SLOUCH');
    expect(nextSnapshot.reason).toMatch(/dipped/i);
  });

  it('falls back to detecting only after the uncertainty grace window persists', () => {
    const previousSnapshot = {
      ...createInitialDisplayedPostureStateSnapshot(0),
      state: 'GOOD_POSTURE' as const,
      stateSince: 0,
      reason: 'Stable posture.',
      rawState: 'GOOD_POSTURE' as const,
      rawCandidateState: 'GOOD_POSTURE' as const,
      pendingState: 'GOOD_POSTURE' as const,
      pendingSince: 0,
    };

    const heldSnapshot = advanceDisplayedPostureState({
      previousSnapshot,
      runtimeSnapshot: createRuntimeSnapshot({
        state: 'DETECTING',
        candidateState: 'DETECTING',
        stateSince: 200,
        candidateSince: 200,
        reason: 'Signal still weak.',
      }),
      timestamp: 1_000,
    });

    expect(heldSnapshot.state).toBe('GOOD_POSTURE');
    expect(heldSnapshot.rawState).toBe('DETECTING');

    const nextSnapshot = advanceDisplayedPostureState({
      previousSnapshot: heldSnapshot,
      runtimeSnapshot: createRuntimeSnapshot({
        state: 'DETECTING',
        candidateState: 'DETECTING',
        stateSince: 200,
        candidateSince: 200,
        reason: 'Signal still weak.',
      }),
      timestamp: 1_700,
    });

    expect(nextSnapshot.state).toBe('DETECTING');
    expect(nextSnapshot.rawState).toBe('DETECTING');
    expect(nextSnapshot.reason).toMatch(/weak/i);
  });

  it('holds the last stable posture briefly before switching to away or no person', () => {
    const previousSnapshot = {
      ...createInitialDisplayedPostureStateSnapshot(0),
      state: 'GOOD_POSTURE' as const,
      stateSince: 0,
      reason: 'Stable posture.',
      rawState: 'GOOD_POSTURE' as const,
      rawCandidateState: 'GOOD_POSTURE' as const,
      pendingState: 'GOOD_POSTURE' as const,
      pendingSince: 0,
    };

    const heldSnapshot = advanceDisplayedPostureState({
      previousSnapshot,
      runtimeSnapshot: createRuntimeSnapshot({
        state: 'AWAY',
        candidateState: 'NO_PERSON',
        stateSince: 500,
        candidateSince: 500,
        reason: 'The user has stepped away.',
      }),
      timestamp: 1_000,
    });

    expect(heldSnapshot.state).toBe('GOOD_POSTURE');
    expect(heldSnapshot.rawState).toBe('AWAY');

    const nextSnapshot = advanceDisplayedPostureState({
      previousSnapshot: heldSnapshot,
      runtimeSnapshot: createRuntimeSnapshot({
        state: 'AWAY',
        candidateState: 'NO_PERSON',
        stateSince: 500,
        candidateSince: 500,
        reason: 'The user has stepped away.',
      }),
      timestamp: 1_500,
    });

    expect(nextSnapshot.state).toBe('AWAY');
    expect(nextSnapshot.rawState).toBe('AWAY');
  });
});
