import type { PoseInferenceSnapshot } from '@/core/inference/inference.types';
import { DEFAULT_KEYPOINT_SCORE_THRESHOLD } from '@/core/inference/inference.constants';
import { mapKeypointsByName, midpoint } from '@/core/processing/geometry';
import type { FrameQualityState } from '@/core/processing/processing.types';
import type { PoseKeypoint } from '@/types/domain';

type PoseOverlayProps = {
  pose: PoseInferenceSnapshot | null;
  frameQualityState?: FrameQualityState | null;
};

type SkeletonPoint = {
  x: number;
  y: number;
};

type SkeletonConnection = {
  id: string;
  from: string;
  to: string;
  quality: 'core' | 'support';
};

const CONNECTIONS: SkeletonConnection[] = [
  { id: 'left-head', from: 'left_ear', to: 'nose', quality: 'support' },
  { id: 'right-head', from: 'right_ear', to: 'nose', quality: 'support' },
  { id: 'head-band', from: 'left_ear', to: 'right_ear', quality: 'support' },
  { id: 'left-neck', from: 'left_ear', to: 'neck', quality: 'support' },
  { id: 'right-neck', from: 'right_ear', to: 'neck', quality: 'support' },
  { id: 'shoulders', from: 'left_shoulder', to: 'right_shoulder', quality: 'core' },
  { id: 'left-upper-arm', from: 'left_shoulder', to: 'left_elbow', quality: 'support' },
  { id: 'right-upper-arm', from: 'right_shoulder', to: 'right_elbow', quality: 'support' },
  { id: 'spine', from: 'neck', to: 'hip_center', quality: 'core' },
  { id: 'left-torso', from: 'left_shoulder', to: 'left_hip', quality: 'core' },
  { id: 'right-torso', from: 'right_shoulder', to: 'right_hip', quality: 'core' },
  { id: 'hips', from: 'left_hip', to: 'right_hip', quality: 'core' },
];

export function PoseOverlay({ pose, frameQualityState = 'GOOD' }: PoseOverlayProps) {
  if (!pose || pose.keypoints.length === 0) {
    return null;
  }

  const effectiveFrameQualityState = frameQualityState ?? 'GOOD';
  const qualityAppearance = getQualityAppearance(effectiveFrameQualityState);
  const visibleKeypoints = pose.keypoints.filter(
    (keypoint) => keypoint.score >= qualityAppearance.keypointThreshold,
  );
  const points = buildSkeletonPoints(visibleKeypoints);
  const visibleConnections = CONNECTIONS.filter((connection) => {
    if (connection.quality === 'support' && effectiveFrameQualityState === 'POOR') {
      return false;
    }

    return points[connection.from] && points[connection.to];
  });

  if (Object.keys(points).length === 0 || visibleConnections.length === 0) {
    return null;
  }

  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox={`0 0 ${pose.width} ${pose.height}`}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      data-testid="pose-overlay-svg"
    >
      {visibleConnections.map((connection) => {
        const from = points[connection.from];
        const to = points[connection.to];

        return (
          <g key={connection.id}>
            <line
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke={qualityAppearance.glowStroke}
              strokeWidth={qualityAppearance.glowStrokeWidth}
              strokeLinecap="round"
              opacity={qualityAppearance.glowOpacity}
            />
            <line
              data-testid="pose-connection"
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke={qualityAppearance.stroke}
              strokeWidth={qualityAppearance.strokeWidth}
              strokeLinecap="round"
              opacity={connection.quality === 'support' ? qualityAppearance.supportOpacity : 1}
            />
          </g>
        );
      })}

      {Object.entries(points).map(([name, point]) => (
        <g key={name}>
          <circle
            cx={point.x}
            cy={point.y}
            r={isVirtualPoint(name) ? qualityAppearance.virtualJointRadius : qualityAppearance.jointRadius + 2}
            fill={qualityAppearance.glowStroke}
            opacity={qualityAppearance.glowOpacity}
          />
          <circle
            data-testid="pose-joint"
            cx={point.x}
            cy={point.y}
            r={isVirtualPoint(name) ? qualityAppearance.virtualJointRadius : qualityAppearance.jointRadius}
            fill={qualityAppearance.fill}
            stroke={qualityAppearance.jointStroke}
            strokeWidth={qualityAppearance.jointStrokeWidth}
            opacity={isVirtualPoint(name) ? qualityAppearance.supportOpacity : 1}
          />
        </g>
      ))}
    </svg>
  );
}

function buildSkeletonPoints(keypoints: PoseKeypoint[]) {
  const map = mapKeypointsByName(keypoints);
  const points: Record<string, SkeletonPoint> = {};

  for (const keypoint of keypoints) {
    points[keypoint.name] = {
      x: keypoint.x,
      y: keypoint.y,
    };
  }

  const leftShoulder = map.get('left_shoulder');
  const rightShoulder = map.get('right_shoulder');
  const leftHip = map.get('left_hip');
  const rightHip = map.get('right_hip');

  if (leftShoulder && rightShoulder) {
    points.neck = midpoint(leftShoulder, rightShoulder);
  }

  if (leftHip && rightHip) {
    points.hip_center = midpoint(leftHip, rightHip);
  }

  return points;
}

function isVirtualPoint(name: string) {
  return name === 'neck' || name === 'hip_center';
}

function getQualityAppearance(frameQualityState: FrameQualityState) {
  if (frameQualityState === 'POOR') {
    return {
      keypointThreshold: Math.max(DEFAULT_KEYPOINT_SCORE_THRESHOLD, 0.55),
      stroke: 'rgba(103, 232, 249, 0.42)',
      glowStroke: 'rgba(34, 211, 238, 0.18)',
      fill: 'rgba(186, 230, 253, 0.72)',
      jointStroke: 'rgba(8, 47, 73, 0.82)',
      strokeWidth: 2,
      glowStrokeWidth: 5,
      jointRadius: 3.2,
      virtualJointRadius: 2.5,
      jointStrokeWidth: 1.2,
      glowOpacity: 0.42,
      supportOpacity: 0.5,
    };
  }

  if (frameQualityState === 'LIMITED') {
    return {
      keypointThreshold: Math.max(DEFAULT_KEYPOINT_SCORE_THRESHOLD, 0.42),
      stroke: 'rgba(103, 232, 249, 0.62)',
      glowStroke: 'rgba(56, 189, 248, 0.2)',
      fill: 'rgba(224, 242, 254, 0.82)',
      jointStroke: 'rgba(8, 47, 73, 0.9)',
      strokeWidth: 2.4,
      glowStrokeWidth: 5.8,
      jointRadius: 3.8,
      virtualJointRadius: 2.8,
      jointStrokeWidth: 1.3,
      glowOpacity: 0.56,
      supportOpacity: 0.72,
    };
  }

  return {
    keypointThreshold: DEFAULT_KEYPOINT_SCORE_THRESHOLD,
    stroke: 'rgba(125, 211, 252, 0.78)',
    glowStroke: 'rgba(34, 211, 238, 0.22)',
    fill: 'rgba(239, 246, 255, 0.92)',
    jointStroke: 'rgba(12, 74, 110, 0.95)',
    strokeWidth: 2.8,
    glowStrokeWidth: 6.5,
    jointRadius: 4.2,
    virtualJointRadius: 3,
    jointStrokeWidth: 1.4,
    glowOpacity: 0.64,
    supportOpacity: 0.84,
  };
}
