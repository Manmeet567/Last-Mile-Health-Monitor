import { useEffect, useRef, useState } from 'react';
import { computePostureFeatures } from '@/core/posture/posture-features';
import { assessPoseConfidence } from '@/core/processing/confidence-gating';
import { normalizePoseFrame } from '@/core/processing/keypoint-normalizer';
import { PoseSignalSmoother } from '@/core/processing/temporal-filter';
import type { NormalizedPoseFrame, ProcessedPoseFrame } from '@/core/processing/processing.types';
import type { PoseFrame } from '@/types/domain';

const SIGNAL_GRACE_WINDOW_MS = 1_200;
const SIGNAL_RESET_AFTER_MS = 3_000;

export function useLiveMetrics(pose: PoseFrame | null) {
  const smootherRef = useRef(new PoseSignalSmoother());
  const previousNormalizedPoseRef = useRef<NormalizedPoseFrame | null>(null);
  const lastReliableFrameRef = useRef<ProcessedPoseFrame | null>(null);
  const lastReliableTimestampRef = useRef<number | null>(null);
  const [processedPose, setProcessedPose] = useState<ProcessedPoseFrame | null>(null);

  useEffect(() => {
    if (!pose) {
      smootherRef.current.reset();
      previousNormalizedPoseRef.current = null;
      lastReliableFrameRef.current = null;
      lastReliableTimestampRef.current = null;
      setProcessedPose(null);
      return;
    }

    const confidence = assessPoseConfidence(pose);
    const normalizedPose = normalizePoseFrame(
      pose.timestamp,
      pose.overallScore,
      confidence.reliableKeypoints,
    );

    if (!confidence.isPoseReliable || !normalizedPose) {
      const lastReliableFrame = lastReliableFrameRef.current;
      const lastReliableTimestamp = lastReliableTimestampRef.current;
      const dropoutDurationMs =
        lastReliableTimestamp === null ? SIGNAL_GRACE_WINDOW_MS + 1 : pose.timestamp - lastReliableTimestamp;
      const shouldHoldLastReliableFrame =
        lastReliableFrame !== null &&
        lastReliableTimestamp !== null &&
        dropoutDurationMs <= SIGNAL_GRACE_WINDOW_MS;

      if (shouldHoldLastReliableFrame) {
        setProcessedPose({
          rawPose: pose,
          confidence,
          normalizedPose: lastReliableFrame.normalizedPose,
          features: {
            ...lastReliableFrame.features,
            timestamp: pose.timestamp,
          },
          stability: {
            signalQuality: 'grace_hold',
            lastReliableTimestamp,
            dropoutDurationMs,
            graceWindowMs: SIGNAL_GRACE_WINDOW_MS,
          },
        });
        return;
      }

      if (dropoutDurationMs >= SIGNAL_RESET_AFTER_MS) {
        smootherRef.current.reset();
        previousNormalizedPoseRef.current = null;
      }

      setProcessedPose({
        rawPose: pose,
        confidence,
        normalizedPose: null,
        features: computePostureFeatures(null, null, false, pose.timestamp),
        stability: {
          signalQuality: 'unreliable',
          lastReliableTimestamp,
          dropoutDurationMs,
          graceWindowMs: SIGNAL_GRACE_WINDOW_MS,
        },
      });
      return;
    }

    const smoothedNormalizedPose = smootherRef.current.smoothNormalizedPoseFrame(normalizedPose);
    const smoothedFeatures = smootherRef.current.smoothFeatures(
      computePostureFeatures(
        smoothedNormalizedPose,
        previousNormalizedPoseRef.current,
        confidence.isPoseReliable,
      ),
    );

    const nextProcessedPose: ProcessedPoseFrame = {
      rawPose: pose,
      confidence,
      normalizedPose: smoothedNormalizedPose,
      features: smoothedFeatures,
      stability: {
        signalQuality: 'reliable',
        lastReliableTimestamp: pose.timestamp,
        dropoutDurationMs: 0,
        graceWindowMs: SIGNAL_GRACE_WINDOW_MS,
      },
    };

    setProcessedPose(nextProcessedPose);
    previousNormalizedPoseRef.current = smoothedNormalizedPose;
    lastReliableFrameRef.current = nextProcessedPose;
    lastReliableTimestampRef.current = pose.timestamp;
  }, [pose]);

  return {
    processedPose,
  };
}
