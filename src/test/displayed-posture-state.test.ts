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
    };

    const nextSnapshot = advanceDisplayedPostureState({
      previousSnapshot,
      runtimeSnapshot: createRuntimeSnapshot({
        state: 'DETECTING',
        candidateState: 'DETECTING',
        stateSince: 0,
        candidateSince: 0,
        reason: 'Signal still weak.',
      }),
      timestamp: 2_200,
    });

    expect(nextSnapshot.state).toBe('DETECTING');
    expect(nextSnapshot.rawState).toBe('DETECTING');
    expect(nextSnapshot.reason).toMatch(/weak/i);
  });
});
