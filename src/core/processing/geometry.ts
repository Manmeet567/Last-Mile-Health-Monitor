import type { PoseKeypoint } from '@/types/domain';
import type { ProcessingPoint } from '@/core/processing/processing.types';

export function midpoint(a: ProcessingPoint, b: ProcessingPoint): ProcessingPoint {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  };
}

export function distanceBetween(a: ProcessingPoint, b: ProcessingPoint) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function mapKeypointsByName(keypoints: PoseKeypoint[]) {
  return new Map(keypoints.map((keypoint) => [keypoint.name, keypoint]));
}

export function degreesFromHorizontal(a: ProcessingPoint, b: ProcessingPoint) {
  return (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
}

export function degreesFromVertical(dx: number, dy: number) {
  return (Math.atan2(Math.abs(dx), Math.max(Math.abs(dy), 0.0001)) * 180) / Math.PI;
}
