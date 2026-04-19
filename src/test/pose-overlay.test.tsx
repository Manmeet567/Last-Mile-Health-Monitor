import { render, screen } from '@testing-library/react';
import { PoseOverlay } from '@/components/overlays/pose-overlay';
import type { PoseInferenceSnapshot } from '@/core/inference/inference.types';

function createPose(): PoseInferenceSnapshot {
  return {
    timestamp: 1_000,
    overallScore: 0.94,
    width: 640,
    height: 360,
    backend: 'wasm',
    inferenceTimeMs: 18,
    keypoints: [
      { name: 'nose', x: 320, y: 92, score: 0.95 },
      { name: 'left_ear', x: 288, y: 96, score: 0.91 },
      { name: 'right_ear', x: 352, y: 96, score: 0.92 },
      { name: 'left_shoulder', x: 276, y: 152, score: 0.98 },
      { name: 'right_shoulder', x: 364, y: 152, score: 0.97 },
      { name: 'left_elbow', x: 246, y: 214, score: 0.86 },
      { name: 'right_elbow', x: 394, y: 214, score: 0.87 },
      { name: 'left_hip', x: 292, y: 246, score: 0.95 },
      { name: 'right_hip', x: 348, y: 246, score: 0.94 },
    ],
  };
}

describe('PoseOverlay', () => {
  it('renders a skeleton overlay without raw landmark labels', () => {
    const { container } = render(
      <PoseOverlay pose={createPose()} frameQualityState="GOOD" />,
    );

    expect(screen.getByTestId('pose-overlay-svg')).toBeInTheDocument();
    expect(container.querySelectorAll('[data-testid="pose-connection"]').length).toBeGreaterThan(0);
    expect(container.querySelectorAll('[data-testid="pose-joint"]').length).toBeGreaterThan(0);
    expect(screen.queryByText('left_ear')).not.toBeInTheDocument();
    expect(screen.queryByText('nose')).not.toBeInTheDocument();
    expect(screen.queryByText('right_shoulder')).not.toBeInTheDocument();
  });

  it('renders a quieter skeleton when frame quality is poor', () => {
    const { container } = render(
      <PoseOverlay pose={createPose()} frameQualityState="POOR" />,
    );

    expect(container.querySelectorAll('[data-testid="pose-connection"]').length).toBeLessThan(10);
  });
});
