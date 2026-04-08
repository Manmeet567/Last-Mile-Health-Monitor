/// <reference lib="dom" />

import { expect, test } from '@playwright/test';

const FRAME_WIDTH = 640;
const FRAME_HEIGHT = 360;

test('live monitor stays readable through a brief pose-signal dropout', async ({ page }) => {
  await page.addInitScript(({ frameWidth, frameHeight }) => {
    const stableKeypoints = [
      { name: 'nose', x: 320, y: 95, score: 0.99 },
      { name: 'left_ear', x: 286, y: 103, score: 0.98 },
      { name: 'right_ear', x: 354, y: 103, score: 0.98 },
      { name: 'left_shoulder', x: 272, y: 152, score: 0.99 },
      { name: 'right_shoulder', x: 368, y: 152, score: 0.99 },
      { name: 'left_hip', x: 286, y: 258, score: 0.99 },
      { name: 'right_hip', x: 354, y: 258, score: 0.99 },
    ];
    const weakKeypoints = [
      { name: 'nose', x: 320, y: 95, score: 0.12 },
      { name: 'left_shoulder', x: 272, y: 152, score: 0.12 },
      { name: 'right_shoulder', x: 368, y: 152, score: 0.12 },
      { name: 'left_hip', x: 286, y: 258, score: 0.1 },
      { name: 'right_hip', x: 354, y: 258, score: 0.1 },
    ];

    const createFrame = (
      timestamp: number,
      keypoints: Array<{ name: string; x: number; y: number; score: number }>,
      overallScore: number,
    ) => ({
      timestamp,
      overallScore,
      keypoints,
      width: frameWidth,
      height: frameHeight,
      backend: 'cpu' as const,
      inferenceTimeMs: 14.5,
    });

    const frames = [
      createFrame(1_000, stableKeypoints, 0.99),
      createFrame(1_300, stableKeypoints, 0.99),
      createFrame(1_600, stableKeypoints, 0.99),
      createFrame(1_900, stableKeypoints, 0.99),
      createFrame(2_200, stableKeypoints, 0.99),
      createFrame(2_500, stableKeypoints, 0.99),
      createFrame(2_800, stableKeypoints, 0.99),
      createFrame(3_100, stableKeypoints, 0.99),
      createFrame(3_400, stableKeypoints, 0.99),
      createFrame(3_700, stableKeypoints, 0.99),
      createFrame(4_000, stableKeypoints, 0.99),
      createFrame(4_300, weakKeypoints, 0.16),
      createFrame(4_600, weakKeypoints, 0.16),
      createFrame(4_900, weakKeypoints, 0.16),
      createFrame(5_200, stableKeypoints, 0.99),
      createFrame(5_500, stableKeypoints, 0.99),
      createFrame(5_800, stableKeypoints, 0.99),
    ];

    (window as typeof window & { __LAST_MILE_E2E_POSE_STREAM__?: unknown }).__LAST_MILE_E2E_POSE_STREAM__ = {
      intervalMs: 250,
      frames,
      backend: 'cpu',
    };

    const canvas = document.createElement('canvas');
    canvas.width = frameWidth;
    canvas.height = frameHeight;
    const context = canvas.getContext('2d');

    const drawFrame = (tick: number) => {
      if (!context) {
        return;
      }

      context.fillStyle = '#0f172a';
      context.fillRect(0, 0, frameWidth, frameHeight);
      context.fillStyle = '#22d3ee';
      context.fillRect(250 + (tick % 12), 110, 140, 140);
      context.fillStyle = '#e2e8f0';
      context.beginPath();
      context.arc(320, 78, 32, 0, Math.PI * 2);
      context.fill();
    };

    let tick = 0;
    drawFrame(tick);
    window.setInterval(() => {
      tick += 1;
      drawFrame(tick);
    }, 120);

    const stream = canvas.captureStream(15);
    const fakeDevices = [
      {
        deviceId: 'e2e-camera-1',
        kind: 'videoinput',
        label: 'E2E Camera',
        groupId: 'e2e-group',
        toJSON() {
          return this;
        },
      },
    ];

    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: () => Promise.resolve(stream.clone()),
        enumerateDevices: () => Promise.resolve(fakeDevices),
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        dispatchEvent: () => true,
      },
    });
  }, { frameWidth: FRAME_WIDTH, frameHeight: FRAME_HEIGHT });

  await page.goto('/live-monitor');

  await page.getByRole('button', { name: 'Start camera' }).click();

  const livePostureCard = page.locator('article').filter({
    has: page.getByRole('heading', { name: 'Live posture state' }),
  });

  await expect(page.getByText('Camera: live')).toBeVisible();
  await expect(page.getByText('Worker: live analysis')).toBeVisible();
  await expect(livePostureCard.getByText('GOOD_POSTURE').first()).toBeVisible({ timeout: 8_000 });

  await expect(page.getByText('grace_hold')).toBeVisible({ timeout: 8_000 });
  await expect(livePostureCard.getByText('GOOD_POSTURE').first()).toBeVisible();

  await page.getByRole('button', { name: 'Stop camera' }).click();
  await expect(page.getByText('Camera: idle')).toBeVisible();
});
