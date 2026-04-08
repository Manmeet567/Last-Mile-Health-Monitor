import { useEffect, useRef, useState } from 'react';
import {
  isCameraSupported,
  listVideoInputDevices,
  requestCameraStream,
  stopMediaStream,
} from '@/core/camera/camera.service';
import type { CameraAccessState, CameraDevice } from '@/core/camera/camera.types';

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [devices, setDevices] = useState<CameraDevice[]>([]);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [status, setStatus] = useState<CameraAccessState>('idle');
  const [error, setError] = useState<string | null>(null);
  const isSupported = isCameraSupported();

  useEffect(() => {
    if (!isSupported) {
      return;
    }

    let isMounted = true;

    async function refreshDevices() {
      const nextDevices = await listVideoInputDevices();

      if (!isMounted) {
        return;
      }

      setDevices(nextDevices);
      setSelectedDeviceId((currentId) => {
        const currentDeviceStillExists = nextDevices.some((device) => device.deviceId === currentId);
        return currentDeviceStillExists ? currentId : nextDevices[0]?.deviceId || '';
      });
    }

    void refreshDevices();

    const handleDeviceChange = () => {
      void refreshDevices();
    };

    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);

    return () => {
      isMounted = false;
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
    };
  }, [isSupported]);

  useEffect(() => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    video.srcObject = stream;

    if (!stream) {
      return;
    }

    void video.play().catch(() => {
      setError('The camera stream is ready, but playback could not start automatically.');
    });
  }, [stream]);

  useEffect(() => {
    return () => {
      stopMediaStream(stream);
    };
  }, [stream]);

  async function startCamera(nextDeviceId?: string) {
    if (!isSupported) {
      setStatus('error');
      setError('This browser does not support camera access.');
      return;
    }

    setStatus('requesting');
    setError(null);

    try {
      const nextStream = await requestCameraStream({ deviceId: nextDeviceId || undefined });
      stopMediaStream(stream);
      setStream(nextStream);
      setStatus('ready');

      const nextDevices = await listVideoInputDevices();
      setDevices(nextDevices);

      const nextSelectedDeviceId =
        nextStream.getVideoTracks()[0]?.getSettings().deviceId || nextDeviceId || nextDevices[0]?.deviceId || '';

      setSelectedDeviceId(nextSelectedDeviceId);
    } catch (requestError) {
      const message =
        requestError instanceof DOMException && requestError.name === 'NotAllowedError'
          ? 'Camera permission was denied. Please allow access and try again.'
          : 'The camera could not be started. Check device permissions and availability.';

      setStatus(requestError instanceof DOMException && requestError.name === 'NotAllowedError' ? 'denied' : 'error');
      setError(message);
    }
  }

  async function changeCamera(nextDeviceId: string) {
    setSelectedDeviceId(nextDeviceId);
    await startCamera(nextDeviceId);
  }

  function stopCamera() {
    stopMediaStream(stream);
    setStream(null);
    setStatus('idle');
    setError(null);
  }

  return {
    videoRef,
    devices,
    stream,
    selectedDeviceId,
    status,
    error,
    isSupported,
    startCamera,
    changeCamera,
    stopCamera,
  };
}
