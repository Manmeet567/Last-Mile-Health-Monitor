import { shouldScheduleInferenceFrame } from '@/core/inference/frame-scheduler';

describe('frame scheduler', () => {
  it('blocks scheduling while an inference frame is already in flight', () => {
    expect(
      shouldScheduleInferenceFrame({
        enabled: true,
        lifecycle: 'running',
        documentVisible: true,
        readyState: HTMLMediaElement.HAVE_CURRENT_DATA,
        frameTime: 2_000,
        lastSubmittedFrameAt: 1_000,
        frameIntervalMs: 80,
        inFlightFrame: true,
      }),
    ).toBe(false);
  });

  it('blocks scheduling when the target frame interval has not elapsed yet', () => {
    expect(
      shouldScheduleInferenceFrame({
        enabled: true,
        lifecycle: 'running',
        documentVisible: true,
        readyState: HTMLMediaElement.HAVE_CURRENT_DATA,
        frameTime: 1_040,
        lastSubmittedFrameAt: 1_000,
        frameIntervalMs: 80,
        inFlightFrame: false,
      }),
    ).toBe(false);
  });

  it('allows scheduling only when runtime and timing conditions are satisfied', () => {
    expect(
      shouldScheduleInferenceFrame({
        enabled: true,
        lifecycle: 'ready',
        documentVisible: true,
        readyState: HTMLMediaElement.HAVE_CURRENT_DATA,
        frameTime: 1_200,
        lastSubmittedFrameAt: 1_000,
        frameIntervalMs: 80,
        inFlightFrame: false,
      }),
    ).toBe(true);
  });
});
