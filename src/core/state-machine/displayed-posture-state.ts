import type { LivePostureState } from '@/types/domain';
import type { PostureStateSnapshot } from '@/core/state-machine/state-machine.types';

export type DisplayedPostureStateSnapshot = {
  state: LivePostureState;
  stateSince: number;
  reason: string;
  rawState: LivePostureState;
  rawCandidateState: LivePostureState;
};

export const displayedPostureStateConfig = {
  minimumDisplayMs: 1_200,
  transientDetectingHoldMs: 1_800,
} as const;

export function createInitialDisplayedPostureStateSnapshot(
  timestamp = Date.now(),
): DisplayedPostureStateSnapshot {
  return {
    state: 'NO_PERSON',
    stateSince: timestamp,
    reason: 'Waiting for the first reliable posture signal.',
    rawState: 'NO_PERSON',
    rawCandidateState: 'NO_PERSON',
  };
}

export function advanceDisplayedPostureState(options: {
  previousSnapshot: DisplayedPostureStateSnapshot;
  runtimeSnapshot: PostureStateSnapshot;
  timestamp: number;
}): DisplayedPostureStateSnapshot {
  const { previousSnapshot, runtimeSnapshot, timestamp } = options;
  const stablePresenceState = isStablePresenceState(previousSnapshot.state);
  const runtimeStateChanged = runtimeSnapshot.state !== previousSnapshot.state;
  const runtimeDetectingIsTransient =
    runtimeSnapshot.state === 'DETECTING' &&
    stablePresenceState &&
    timestamp - runtimeSnapshot.stateSince < displayedPostureStateConfig.transientDetectingHoldMs;
  const minimumDisplayHoldActive =
    runtimeStateChanged &&
    timestamp - previousSnapshot.stateSince < displayedPostureStateConfig.minimumDisplayMs;

  if (runtimeSnapshot.state === previousSnapshot.state) {
    return {
      ...previousSnapshot,
      reason: runtimeSnapshot.reason,
      rawState: runtimeSnapshot.state,
      rawCandidateState: runtimeSnapshot.candidateState,
    };
  }

  if (runtimeDetectingIsTransient || minimumDisplayHoldActive) {
    return {
      ...previousSnapshot,
      reason: runtimeDetectingIsTransient
        ? 'Holding the last stable posture while the signal briefly reacquires.'
        : previousSnapshot.reason,
      rawState: runtimeSnapshot.state,
      rawCandidateState: runtimeSnapshot.candidateState,
    };
  }

  return {
    state: runtimeSnapshot.state,
    stateSince: timestamp,
    reason: runtimeSnapshot.reason,
    rawState: runtimeSnapshot.state,
    rawCandidateState: runtimeSnapshot.candidateState,
  };
}

function isStablePresenceState(state: LivePostureState) {
  return (
    state === 'GOOD_POSTURE' ||
    state === 'MILD_SLOUCH' ||
    state === 'DEEP_SLOUCH' ||
    state === 'MOVING'
  );
}
