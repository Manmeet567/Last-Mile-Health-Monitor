export type CameraAccessState = 'idle' | 'requesting' | 'ready' | 'denied' | 'error';

export type CameraDevice = {
  deviceId: string;
  label: string;
};

export type CameraConstraintsOptions = {
  deviceId?: string;
  width?: number;
  height?: number;
};
