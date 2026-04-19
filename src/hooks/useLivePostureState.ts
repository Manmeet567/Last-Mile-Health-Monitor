import { useEffect, useRef, useState } from 'react';
import type { CalibrationProfile, LivePostureState } from '@/types/domain';
import {
  advancePostureStateMachine,
  createInitialPostureStateSnapshot,
} from '@/core/state-machine/posture-state-machine';
import {
  advanceDisplayedPostureState,
  createInitialDisplayedPostureStateSnapshot,
  type DisplayedPostureStateSnapshot,
} from '@/core/state-machine/displayed-posture-state';
import type { PostureStateSnapshot } from '@/core/state-machine/state-machine.types';
import type { ProcessedPoseFrame } from '@/core/processing/processing.types';

export function useLivePostureState(
  processedPose: ProcessedPoseFrame | null,
  calibrationProfile: CalibrationProfile | null,
) {
  const initialTimestamp = useRef(Date.now());
  const runtimeSnapshotRef = useRef<PostureStateSnapshot>(
    createInitialPostureStateSnapshot(initialTimestamp.current),
  );
  const displaySnapshotRef = useRef<DisplayedPostureStateSnapshot>(
    createInitialDisplayedPostureStateSnapshot(initialTimestamp.current),
  );
  const [snapshot, setSnapshot] = useState<PostureStateSnapshot>(runtimeSnapshotRef.current);
  const [displaySnapshot, setDisplaySnapshot] = useState<DisplayedPostureStateSnapshot>(
    displaySnapshotRef.current,
  );

  useEffect(() => {
    if (!processedPose) {
      const resetTimestamp = Date.now();
      runtimeSnapshotRef.current = createInitialPostureStateSnapshot(resetTimestamp);
      displaySnapshotRef.current = createInitialDisplayedPostureStateSnapshot(resetTimestamp);
      setSnapshot(runtimeSnapshotRef.current);
      setDisplaySnapshot(displaySnapshotRef.current);
      return;
    }

    const nextRuntimeSnapshot = advancePostureStateMachine({
      input: {
        timestamp: processedPose.features.timestamp,
        poseConfidence: processedPose.rawPose.overallScore,
        reliableKeypointCount: processedPose.confidence.reliableKeypoints.length,
        hasRequiredTorsoKeypoints: processedPose.confidence.hasRequiredTorsoKeypoints,
        features: processedPose.features,
        calibrationProfile,
        signalQuality: processedPose.stability.signalQuality,
        signalDropoutDurationMs: processedPose.stability.dropoutDurationMs,
        frameQuality: processedPose.frameQuality,
      },
      previousSnapshot: runtimeSnapshotRef.current,
    });
    runtimeSnapshotRef.current = nextRuntimeSnapshot;
    setSnapshot(nextRuntimeSnapshot);

    const nextDisplaySnapshot = advanceDisplayedPostureState({
      previousSnapshot: displaySnapshotRef.current,
      runtimeSnapshot: nextRuntimeSnapshot,
      timestamp: processedPose.features.timestamp,
    });
    displaySnapshotRef.current = nextDisplaySnapshot;
    setDisplaySnapshot(nextDisplaySnapshot);
  }, [calibrationProfile, processedPose]);

  const currentTimestamp = processedPose?.features.timestamp ?? Date.now();

  return {
    state: snapshot.state,
    candidateState: snapshot.candidateState,
    stateDurationMs: Math.max(currentTimestamp - snapshot.stateSince, 0),
    reason: snapshot.reason,
    snapshot,
    displayState: displaySnapshot.state,
    displayStateDurationMs: Math.max(currentTimestamp - displaySnapshot.stateSince, 0),
    displayReason: displaySnapshot.reason,
    displaySnapshot,
  } satisfies {
    state: LivePostureState;
    candidateState: LivePostureState;
    stateDurationMs: number;
    reason: string;
    snapshot: PostureStateSnapshot;
    displayState: LivePostureState;
    displayStateDurationMs: number;
    displayReason: string;
    displaySnapshot: DisplayedPostureStateSnapshot;
  };
}
