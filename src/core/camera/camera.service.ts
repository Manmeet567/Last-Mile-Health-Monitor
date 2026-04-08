import type { CameraConstraintsOptions, CameraDevice } from '@/core/camera/camera.types';

const DEFAULT_WIDTH = 1280;
const DEFAULT_HEIGHT = 720;

export function isCameraSupported() {
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.mediaDevices !== 'undefined' &&
    typeof navigator.mediaDevices.getUserMedia === 'function'
  );
}

export function getCameraConstraints({
  deviceId,
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
}: CameraConstraintsOptions = {}): MediaStreamConstraints {
  return {
    audio: false,
    video: {
      width: { ideal: width },
      height: { ideal: height },
      facingMode: 'user',
      ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
    },
  };
}

export async function requestCameraStream(options: CameraConstraintsOptions = {}) {
  return navigator.mediaDevices.getUserMedia(getCameraConstraints(options));
}

export async function listVideoInputDevices(): Promise<CameraDevice[]> {
  if (!isCameraSupported()) {
    return [];
  }

  const devices = await navigator.mediaDevices.enumerateDevices();
  const videoInputs = devices.filter((device) => device.kind === 'videoinput');

  return videoInputs.map((device, index) => ({
    deviceId: device.deviceId,
    label: device.label || `Camera ${index + 1}`,
  }));
}

export function stopMediaStream(stream: MediaStream | null | undefined) {
  stream?.getTracks().forEach((track) => track.stop());
}
