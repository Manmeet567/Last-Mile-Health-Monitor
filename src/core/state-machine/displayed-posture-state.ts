import type { LivePostureState } from '@/types/domain';
import type { PostureStateSnapshot } from '@/core/state-machine/state-machine.types';

export type DisplayedPostureStateSnapshot = {
  state: LivePostureState;
  stateSince: number;
  reason: string;
  rawState: LivePostureState;
  rawCandidateState: LivePostureState;
  pendingState: LivePostureState;
  pendingSince: number;
};

export const displayedPostureStateConfig = {
  minimumDisplayMs: 900,
  pendingCommitMs: 450,
  uncertainGraceMs: 1_200,
  awayGraceMs: 750,
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
    pendingState: 'NO_PERSON',
    pendingSince: timestamp,
  };
}

export function advanceDisplayedPostureState(options: {
  previousSnapshot: DisplayedPostureStateSnapshot;
  runtimeSnapshot: PostureStateSnapshot;
  timestamp: number;
}): DisplayedPostureStateSnapshot {
  const { previousSnapshot, runtimeSnapshot, timestamp } = options;
  const runtimeStateChanged = runtimeSnapshot.state !== previousSnapshot.state;

  if (runtimeSnapshot.state === previousSnapshot.state) {
    return {
      ...previousSnapshot,
      reason: runtimeSnapshot.reason,
      rawState: runtimeSnapshot.state,
      rawCandidateState: runtimeSnapshot.candidateState,
      pendingState: runtimeSnapshot.state,
      pendingSince: timestamp,
    };
  }

  const graceHoldMs = getGraceHoldMs(previousSnapshot.state, runtimeSnapshot.state);
  const shouldHoldForGrace =
    graceHoldMs > 0 && timestamp - runtimeSnapshot.stateSince < graceHoldMs;
  const minimumDisplayHoldActive =
    runtimeStateChanged &&
    timestamp - previousSnapshot.stateSince < displayedPostureStateConfig.minimumDisplayMs;
  const nextPendingState =
    previousSnapshot.pendingState === runtimeSnapshot.state
      ? previousSnapshot.pendingState
      : runtimeSnapshot.state;
  const nextPendingSince =
    previousSnapshot.pendingState === runtimeSnapshot.state
      ? previousSnapshot.pendingSince
      : timestamp;

  if (shouldHoldForGrace || minimumDisplayHoldActive) {
    return {
      ...previousSnapshot,
      reason: shouldHoldForGrace
        ? getGraceHoldReason(runtimeSnapshot.state)
        : previousSnapshot.reason,
      rawState: runtimeSnapshot.state,
      rawCandidateState: runtimeSnapshot.candidateState,
      pendingState: nextPendingState,
      pendingSince: nextPendingSince,
    };
  }

  if (runtimeSnapshot.state !== previousSnapshot.pendingState) {
    return {
      ...previousSnapshot,
      reason: 'Waiting for the next posture state to stay consistent before updating the display.',
      rawState: runtimeSnapshot.state,
      rawCandidateState: runtimeSnapshot.candidateState,
      pendingState: runtimeSnapshot.state,
      pendingSince: timestamp,
    };
  }

  if (
    timestamp - previousSnapshot.pendingSince <
    displayedPostureStateConfig.pendingCommitMs
  ) {
    return {
      ...previousSnapshot,
      reason: 'Waiting for the next posture state to stay consistent before updating the display.',
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
    pendingState: runtimeSnapshot.state,
    pendingSince: timestamp,
  };
}

function getGraceHoldMs(
  displayedState: LivePostureState,
  runtimeState: LivePostureState,
) {
  if (
    runtimeState === 'DETECTING' &&
    isStablePresenceState(displayedState)
  ) {
    return displayedPostureStateConfig.uncertainGraceMs;
  }

  if (
    (runtimeState === 'AWAY' || runtimeState === 'NO_PERSON') &&
    isPresenceOrDetectingState(displayedState)
  ) {
    return displayedPostureStateConfig.awayGraceMs;
  }

  return 0;
}

function getGraceHoldReason(runtimeState: LivePostureState) {
  if (runtimeState === 'DETECTING') {
    return 'Holding the last stable posture while the signal briefly reacquires.';
  }

  if (runtimeState === 'AWAY' || runtimeState === 'NO_PERSON') {
    return 'Holding the last stable posture briefly before showing that no one is detected.';
  }

  return 'Holding the last stable posture briefly while the signal settles.';
}

function isStablePresenceState(state: LivePostureState) {
  return (
    state === 'GOOD_POSTURE' ||
    state === 'MILD_SLOUCH' ||
    state === 'DEEP_SLOUCH' ||
    state === 'MOVING'
  );
}

function isPresenceOrDetectingState(state: LivePostureState) {
  return isStablePresenceState(state) || state === 'DETECTING';
}
