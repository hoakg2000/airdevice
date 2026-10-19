import React, { useEffect, useRef, useState } from 'react';
import { CameraSession, parsePairingHash, type CameraState } from '@air-device/client';
import {
  keepScreenOn,
  openCamera,
  setTorch,
  supportsTorch,
  takePhoto,
  type Facing,
} from './camera';
import { t } from './i18n';

type Problem = 'invalidLink' | 'permissionDenied' | 'cameraError' | 'rejected' | 'ended' | null;

export const App: React.FC = () => {
  const [pairing] = useState(() => parsePairingHash(window.location.hash));
  const [state, setState] = useState<CameraState | 'starting'>('starting');
  const [problem, setProblem] = useState<Problem>(pairing ? null : 'invalidLink');
  const [facing, setFacing] = useState<Facing>('environment');
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const sessionRef = useRef<CameraSession | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const busyRef = useRef(false);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2000);
  };

  const capture = async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    const session = sessionRef.current;
    if (!track || !session || !videoRef.current || busyRef.current) return;
    busyRef.current = true;
    navigator.vibrate?.(50);
    try {
      const photo = await takePhoto(track, videoRef.current);
      showToast((await session.sendPhoto(photo)) ? t.sent : t.sendFailed);
    } catch (err) {
      console.error('[air-device] capture failed', err);
      showToast(t.sendFailed);
    } finally {
      busyRef.current = false;
    }
  };
  // The desktop's capture request arrives through a callback set once; keep it current
  const captureRef = useRef(capture);
  captureRef.current = capture;

  useEffect(() => {
    if (!pairing) return;
    let cancelled = false;
    let wakeLock: WakeLockSentinel | undefined;

    (async () => {
      try {
        const stream = await openCamera('environment');
        if (cancelled) return stream.getTracks().forEach((track) => track.stop());
        streamRef.current = stream;
        attachStream(stream);

        const session = new CameraSession(pairing, stream);
        sessionRef.current = session;
        session.onState = (next) => {
          setState(next);
          if (next === 'ended') setProblem('ended');
          if (next === 'error') setProblem('rejected');
        };
        session.onCaptureRequest = () => captureRef.current();
        session.start();
        wakeLock = await keepScreenOn();
      } catch (err) {
        setProblem((err as Error).name === 'NotAllowedError' ? 'permissionDenied' : 'cameraError');
      }
    })();

    return () => {
      cancelled = true;
      sessionRef.current?.destroy();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      wakeLock?.release();
    };
  }, [pairing]);

  const attachStream = (stream: MediaStream) => {
    if (videoRef.current) videoRef.current.srcObject = stream;
    const track = stream.getVideoTracks()[0];
    // Contrast-preserving encoding: keep text on documents sharp
    if (track) track.contentHint = 'detail';
    setTorchAvailable(Boolean(track && supportsTorch(track)));
    setTorchOn(false);
  };

  const switchCamera = async () => {
    const next: Facing = facing === 'environment' ? 'user' : 'environment';
    try {
      const stream = await openCamera(next);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = stream;
      attachStream(stream);
      await sessionRef.current?.setStream(stream);
      setFacing(next);
    } catch (err) {
      console.error('[air-device] switch camera failed', err);
    }
  };

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    try {
      await setTorch(track, !torchOn);
      setTorchOn(!torchOn);
    } catch (err) {
      console.error('[air-device] torch failed', err);
    }
  };

  const status =
    state === 'paired' ? `🟢 ${t.live}` : state === 'starting' ? t.starting : t.connecting;

  return (
    <div className="camera-viewport">
      <video ref={videoRef} className="local-video" autoPlay playsInline muted />

      {problem ? (
        <div className="overlay" role="alert">
          {t[problem]}
        </div>
      ) : (
        <div className="status-badge" role="status">
          {status}
        </div>
      )}

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}

      {state === 'paired' && !problem && (
        <div className="camera-controls">
          <button
            className="icon-btn"
            onClick={toggleTorch}
            aria-label={t.torch}
            disabled={!torchAvailable}
          >
            {torchOn ? '🔦' : '💡'}
          </button>
          <button className="capture-btn-mobile" onClick={capture} aria-label={t.capture}>
            <div className="inner-circle"></div>
          </button>
          <button className="icon-btn" onClick={switchCamera} aria-label={t.switchCamera}>
            🔄
          </button>
        </div>
      )}
    </div>
  );
};
