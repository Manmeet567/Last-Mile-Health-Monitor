import type { PoseInferenceSnapshot } from '@/core/inference/inference.types';
import { DEFAULT_KEYPOINT_SCORE_THRESHOLD } from '@/core/inference/inference.constants';

type PoseOverlayProps = {
  pose: PoseInferenceSnapshot | null;
};

export function PoseOverlay({ pose }: PoseOverlayProps) {
  if (!pose || pose.keypoints.length === 0) {
    return (
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="rounded-full border border-white/10 bg-slate-950/75 px-4 py-2 text-xs font-medium tracking-[0.2em] text-slate-300">
          Awaiting pose detection
        </div>
      </div>
    );
  }

  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox={`0 0 ${pose.width} ${pose.height}`}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      {pose.keypoints
        .filter((keypoint) => keypoint.score >= DEFAULT_KEYPOINT_SCORE_THRESHOLD)
        .map((keypoint) => (
          <g key={keypoint.name}>
            <circle
              cx={keypoint.x}
              cy={keypoint.y}
              r="10"
              fill="rgba(34, 211, 238, 0.95)"
              stroke="rgba(2, 6, 23, 0.95)"
              strokeWidth="4"
            />
            <text
              x={keypoint.x + 14}
              y={keypoint.y - 12}
              fill="#e2e8f0"
              fontSize="18"
              fontWeight="600"
            >
              {keypoint.name}
            </text>
          </g>
        ))}
    </svg>
  );
}
