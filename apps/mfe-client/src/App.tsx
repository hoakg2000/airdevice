// apps/mfe-client/src/App.tsx
import React, { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { QRCodeSVG } from 'qrcode.react';
import { ServerEvents, ClientEvents } from '@air-device/shared-types';
import { AirDevicePeer } from '@air-device/webrtc-core';

export const App: React.FC = () => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [peerConnected, setPeerConnected] = useState(false);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  
  // State hiệu ứng chớp camera
  const [isFlashing, setIsFlashing] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const peer = new AirDevicePeer(false);
    const socket: Socket<ServerEvents, ClientEvents> = io('http://localhost:3000', {
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('message', { type: 'SESSION_INIT', payload: { deviceType: 'desktop' } });
    });

    socket.on('session_created', (data) => setSessionId(data.sessionId));
    socket.on('peer_connected', () => setPeerConnected(true));

    peer.onLocalSdpReady = (sdp) => socket.emit('message', { type: 'WEBRTC_SDP', payload: sdp as any });
    peer.onLocalIceReady = (ice) => socket.emit('message', { type: 'WEBRTC_ICE', payload: ice as any });

    socket.on('webrtc_sdp_received', (sdp) => peer.handleRemoteSdp(sdp));
    socket.on('webrtc_ice_received', (ice) => peer.handleRemoteIce(ice));

    peer.onTrackReceived = (track, streams) => {
      const stream = (streams && streams.length > 0) ? streams[0] : new MediaStream([track]);
      setRemoteStream(stream);
    };

    // LẮNG NGHE LỆNH TỪ MOBILE
    socket.on('device_command_received', (payload) => {
      if (payload.action === 'CAPTURE') {
        console.log('📸 Nhận lệnh chụp từ Mobile!');
        triggerCaptureAction();
      }
    });

    return () => {
      socket.disconnect();
      peer.destroy();
    };
  }, []);

  useEffect(() => {
    if (videoRef.current && remoteStream) {
      videoRef.current.srcObject = remoteStream;
      videoRef.current.onloadedmetadata = () => {
        videoRef.current?.play().catch(e => console.warn("Auto-play error:", e));
      };
    }
  }, [remoteStream, peerConnected]);

  // Tách hàm xử lý chụp ảnh riêng để gọi được từ nhiều nguồn (Nút bấm MFE hoặc Socket từ Mobile)
  const triggerCaptureAction = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    // Hiệu ứng chớp nháy
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 300);

    // Xử lý canvas
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const base64Image = canvas.toDataURL('image/jpeg', 0.9);
      
      const captureEvent = new CustomEvent('air-device-frame-captured', {
        detail: { imageBase64: base64Image },
        bubbles: true,
        composed: true
      });
      window.dispatchEvent(captureEvent);
    }
  };

  const mobileAppUrl = `https://192.168.1.4:5174/?sessionId=${sessionId}`; // Đổi lại IP LAN của bạn

  return (
    <div className="air-device-host">
      {!isConnected ? (
        <h3 className="standby-text pulse">Vui lòng chờ, đang khởi tạo kết nối...</h3>
      ) : peerConnected ? (
        <div>
          {/* Header Generic */}
          <h3 style={{ color: '#111827', marginBottom: '8px', marginTop: 0 }}>
             AirDevice - Remote Camera
          </h3>
          <p style={{ color: '#6b7280', fontSize: '0.9rem', margin: 0 }}>
             🟢 Kết nối thành công. Vui lòng căn chỉnh khung hình trên thiết bị di động.
          </p>
          
          <div className="video-container">
             {/* Lớp phủ nháy Flash */}
            <div className={`flash-effect ${isFlashing ? 'active' : ''}`}></div>
            <video ref={videoRef} className="remote-video" autoPlay playsInline muted />
          </div>

          <canvas ref={canvasRef} style={{ display: 'none' }} />

          {/* Vẫn giữ nút chụp thủ công trên PC (Fallback) */}
          <button className="capture-btn" onClick={triggerCaptureAction}>
            📸 Chụp Ảnh Ngay
          </button>
        </div>
      ) : sessionId ? (
        <div>
          <h3 style={{ marginTop: 0, color: '#111827' }}>Kết nối Camera Di động</h3>
          <div className="qr-container">
            <div className="qr-box">
              <QRCodeSVG value={mobileAppUrl} size={130} />
            </div>
            <div className="qr-steps">
              <h4>Hướng dẫn thao tác:</h4>
              <ol>
                <li>Mở ứng dụng <b>Camera</b> trên điện thoại.</li>
                <li><b>Quét mã QR</b> bên cạnh để nhận liên kết.</li>
                <li>Nhấn <b>Cho phép truy cập Camera</b> trên trình duyệt điện thoại.</li>
              </ol>
            </div>
          </div>
          <p style={{ fontSize: '0.8rem', marginTop: '15px', color: '#9ca3af', textAlign: 'center' }}>
            Mã phiên kết nối: {sessionId.split('-')[0]}...
          </p>
        </div>
      ) : null}
    </div>
  );
};