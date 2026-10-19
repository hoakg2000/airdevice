import React, { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { HostSession, type HostState, type PairingInfo } from '@air-device/client';
import { getMessages } from './i18n';

export interface AppProps {
  serverUrl: string;
  mobileUrl?: string;
  lang: string;
  emit: (name: string, detail?: unknown) => void;
}

const formatSeconds = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export const App: React.FC<AppProps> = ({ serverUrl, mobileUrl, lang, emit }) => {
  const t = getMessages(lang);
  const [state, setState] = useState<HostState>('connecting');
  const [pairing, setPairing] = useState<PairingInfo | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [phoneLeft, setPhoneLeft] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [attempt, setAttempt] = useState(0);

  const sessionRef = useRef<HostSession | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Keep the latest emit without restarting the session when the host re-renders
  const emitRef = useRef(emit);
  emitRef.current = emit;

  useEffect(() => {
    const session = new HostSession({ serverUrl, mobileUrl });
    sessionRef.current = session;
    let wasPaired = false;

    session.onState = (next) => {
      setState(next);
      if (next === 'paired') {
        wasPaired = true;
        setPhoneLeft(false);
        emitRef.current('paired');
      } else if (wasPaired && next === 'waiting') {
        wasPaired = false;
        setPhoneLeft(true);
        emitRef.current('disconnected');
      }
    };
    session.onPairing = setPairing;
    session.onStream = setStream;
    session.onPhoto = (photo) => {
      setCapturing(false);
      flash();
      emitRef.current('capture', { photo, source: 'device' });
    };
    session.onError = (code, message) => {
      setCapturing(false);
      emitRef.current('error', { code, message });
    };
    session.start();

    return () => session.destroy();
  }, [serverUrl, mobileUrl, attempt]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream;
  }, [stream, state]);

  // Countdown for the QR code while waiting
  useEffect(() => {
    if (state !== 'waiting') return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [state]);

  const flash = () => {
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 300);
  };

  // Fallback when the phone can't send a photo: grab the current video frame
  const grabFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    canvas.toBlob(
      (photo) => {
        if (photo) emitRef.current('capture', { photo, source: 'stream' });
      },
      'image/jpeg',
      0.92,
    );
    flash();
  };

  const handleCapture = () => {
    if (sessionRef.current?.capture()) {
      setCapturing(true);
      // Don't leave the button stuck if the phone never answers
      setTimeout(() => setCapturing(false), 10_000);
    } else {
      grabFrame();
    }
  };

  const copyLink = async () => {
    if (!pairing) return;
    try {
      await navigator.clipboard.writeText(pairing.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (no permission / insecure context); link stays visible in the QR
    }
  };

  const secondsLeft = pairing ? Math.max(0, Math.ceil((pairing.expiresAt - now) / 1000)) : 0;
  const expired = pairing !== null && secondsLeft === 0;

  return (
    <div className="air-device-host" part="container">
      {state === 'connecting' && (
        <p className="status pulse" role="status">
          {t.connecting}
        </p>
      )}

      {state === 'error' && (
        <div className="status" role="alert">
          <p>{t.error}</p>
          <button className="btn" onClick={() => setAttempt((n) => n + 1)}>
            {t.retry}
          </button>
        </div>
      )}

      {state === 'waiting' && pairing && (
        <div>
          <h3 className="title">{t.title}</h3>
          {phoneLeft && (
            <p className="notice" role="status">
              {t.phoneLeft}
            </p>
          )}
          <div className="qr-container">
            <div className={`qr-box ${expired ? 'expired' : ''}`} part="qr">
              <QRCodeSVG value={pairing.url} size={140} aria-label={t.title} />
            </div>
            <ol className="qr-steps">
              {t.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>
          <div className="qr-footer" aria-live="polite">
            {expired ? (
              <>
                <span>{t.expired}</span>
                <button className="btn" onClick={() => sessionRef.current?.regenerate()}>
                  {t.regenerate}
                </button>
              </>
            ) : (
              <>
                <span>
                  {t.expiresIn} {formatSeconds(secondsLeft)}
                </span>
                <button className="btn btn-ghost" onClick={copyLink}>
                  {copied ? t.copied : t.copyLink}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {state === 'paired' && (
        <div>
          <p className="notice" role="status">
            {t.paired}
          </p>
          <div className="video-container" part="video">
            <div className={`flash-effect ${isFlashing ? 'active' : ''}`} />
            {!stream && <span className="video-placeholder">{t.waitingVideo}</span>}
            <video ref={videoRef} className="remote-video" autoPlay playsInline muted />
          </div>
          <button
            className="btn btn-primary capture-btn"
            part="capture-button"
            onClick={handleCapture}
            disabled={!stream || capturing}
          >
            {capturing ? t.capturing : t.capture}
          </button>
        </div>
      )}

      <canvas ref={canvasRef} hidden />
    </div>
  );
};
