import type { LivePostureState, PostureEvent } from '@/types/domain';
import {
  classifyImmediateState,
  defaultStateMachineConfig,
  deriveStateMachineConfig,
} from '@/core/state-machine/transition-rules';
import type {
  PostureStateMachineConfig,
  PostureStateMachineInput,
  PostureStateSnapshot,
} from '@/core/state-machine/state-machine.types';

export function createInitialPostureStateSnapshot(timestamp = Date.now()): PostureStateSnapshot {
  return {
    state: 'NO_PERSON',
    candidateState: 'NO_PERSON',
    stateSince: timestamp,
    candidateSince: timestamp,
    reason: 'Waiting for the first reliable posture signal.',
    emittedEvents: [],
  };
}

export function advancePostureStateMachine(options: {
  input: PostureStateMachineInput | null;
  previousSnapshot: PostureStateSnapshot;
  config?: PostureStateMachineConfig;
}): PostureStateSnapshot {
  const { input, previousSnapshot } = options;
  const config = options.config ?? deriveStateMachineConfig(input?.calibrationProfile ?? null);
  const timestamp = input?.timestamp ?? previousSnapshot.candidateSince;
  const immediate = classifyImmediateState(input, previousSnapshot.state, config);

  if (immediate.state === previousSnapshot.state) {
    return {
      ...previousSnapshot,
      candidateState: immediate.state,
      candidateSince: timestamp,
      reason: immediate.reason,
      emittedEvents: [],
    };
  }

  if (immediate.state !== previousSnapshot.candidateState) {
    return {
      ...previousSnapshot,
      candidateState: immediate.state,
      candidateSince: timestamp,
      reason: immediate.reason,
      emittedEvents: [],
    };
  }

  const dwellMs = getRequiredDwell(previousSnapshot.state, immediate.state, config);
  if (timestamp - previousSnapshot.candidateSince < dwellMs) {
    return {
      ...previousSnapshot,
      reason: immediate.reason,
      emittedEvents: [],
    };
  }

  return {
    state: immediate.state,
    candidateState: immediate.state,
    stateSince: timestamp,
    candidateSince: timestamp,
    reason: immediate.reason,
    emittedEvents: deriveTransitionEvents(previousSnapshot.state, immediate.state, timestamp),
  };
}

function getRequiredDwell(
  currentState: LivePostureState,
  nextState: LivePostureState,
  config: PostureStateMachineConfig,
) {
  if (currentState === 'AWAY' && nextState === 'NO_PERSON') {
    return config.awayToNoPersonMs;
  }

  return config.dwellMs[nextState] ?? defaultStateMachineConfig.dwellMs[nextState];
}

function deriveTransitionEvents(
  previousState: LivePostureState,
  nextState: LivePostureState,
  timestamp: number,
): PostureEvent[] {
  const eventTypes: PostureEvent['type'][] = [];

  if (previousState === 'MILD_SLOUCH' && nextState !== 'MILD_SLOUCH') {
    eventTypes.push('MILD_SLOUCH_ENDED');
  }

  if (previousState === 'DEEP_SLOUCH' && nextState !== 'DEEP_SLOUCH') {
    eventTypes.push('DEEP_SLOUCH_ENDED');
  }

  if (nextState === 'MILD_SLOUCH' && previousState !== 'MILD_SLOUCH') {
    eventTypes.push('MILD_SLOUCH_STARTED');
  }

  if (nextState === 'DEEP_SLOUCH' && previousState !== 'DEEP_SLOUCH') {
    eventTypes.push('DEEP_SLOUCH_STARTED');
  }

  if (nextState === 'AWAY' && previousState !== 'AWAY') {
    eventTypes.push('BREAK_STARTED');
  }

  if (previousState === 'AWAY' && nextState !== 'AWAY' && nextState !== 'NO_PERSON') {
    eventTypes.push('BREAK_ENDED');
  }

  return eventTypes.map((type, index) => ({
    id: `posture-event-${timestamp}-${index + 1}-${type.toLowerCase()}`,
    type,
    timestamp,
    metadata: {
      fromState: previousState,
      toState: nextState,
    },
  }));
}
