// Not in lib.dom typings yet (Chromium-only); Safari falls back to a canvas frame
declare global {
  interface Window {
    ImageCapture?: new (track: MediaStreamTrack) => { takePhoto(): Promise<Blob> };
  }
}

export type Facing = 'environment' | 'user';

export function openCamera(facingMode: Facing) {
  return navigator.mediaDevices.getUserMedia({
    video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
    audio: false,
  });
}

export function supportsTorch(track: MediaStreamTrack) {
  const caps = track.getCapabilities?.() as { torch?: boolean } | undefined;
  return Boolean(caps?.torch);
}

export function setTorch(track: MediaStreamTrack, on: boolean) {
  return track.applyConstraints({ advanced: [{ torch: on } as MediaTrackConstraintSet] });
}

// Full sensor resolution where ImageCapture exists, otherwise the current video frame
export async function takePhoto(track: MediaStreamTrack, video: HTMLVideoElement): Promise<Blob> {
  if (window.ImageCapture) {
    try {
      return await new window.ImageCapture(track).takePhoto();
    } catch {
      // Some devices reject takePhoto while streaming; use the frame instead
    }
  }
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d')!.drawImage(video, 0, 0);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))),
      'image/jpeg',
      0.92,
    ),
  );
}

export async function keepScreenOn() {
  try {
    return await navigator.wakeLock?.request('screen');
  } catch {
    return undefined; // Not supported or denied; the stream still works
  }
}
