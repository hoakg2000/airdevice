// apps/mobile-client/src/App.tsx
import React, { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { ServerEvents, ClientEvents } from '@air-device/shared-types';
import { AirDevicePeer } from '@air-device/webrtc-core';

export const App: React.FC = () => {
  const [status, setStatus] = useState<string>('Đang khởi tạo...');
  const [isReadyToCapture, setIsReadyToCapture] = useState(false);

  // Dùng Ref để giữ instance của socket để gọi được trong hàm handleCapture
  const socketRef = useRef<Socket<ServerEvents, ClientEvents> | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const sessionId = new URLSearchParams(window.location.search).get('sessionId');

  useEffect(() => {
    if (!sessionId) {
      setStatus('Lỗi: Không tìm thấy Session ID.');
      return;
    }

    let localStream: MediaStream | null = null;
    const peer = new AirDevicePeer(true);

    // Khởi tạo Socket và lưu vào Ref
    const socket: Socket<ServerEvents, ClientEvents> = io('/', { transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      setStatus('Đang kết nối Camera...');
      socket.emit('message', {
        type: 'JOIN_SESSION',
        payload: { sessionId, deviceType: 'mobile' },
      });
      startCamera(peer);
    });

    peer.onLocalSdpReady = (sdp) =>
      socket.emit('message', { type: 'WEBRTC_SDP', payload: sdp as any });
    peer.onLocalIceReady = (ice) =>
      socket.emit('message', { type: 'WEBRTC_ICE', payload: ice as any });

    socket.on('webrtc_sdp_received', (sdp) => peer.handleRemoteSdp(sdp));
    socket.on('webrtc_ice_received', (ice) => peer.handleRemoteIce(ice));

    const startCamera = async (webrtcPeer: AirDevicePeer) => {
      try {
        localStream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: 'environment',
            // width: { ideal: 1920 },
            // height: { ideal: 1080 },
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 } 
          },
          audio: false
        });

        // Báo cho thuật toán biết đây là tài liệu (giữ nét chữ)
        localStream.getTracks().forEach((track) => {
          if (track.kind === 'video' && 'contentHint' in track) {
            track.contentHint = 'detail';
          }
        });

        if (videoRef.current) {
          videoRef.current.srcObject = localStream;
        }

        webrtcPeer.addLocalStream(localStream);
        setStatus('🟢 Đang phát trực tiếp');
        setIsReadyToCapture(true);
      } catch (err) {
        console.error('Camera error:', err);
        setStatus('❌ Lỗi truy cập Camera.');
      }
    };

    // Xử lý lắng nghe sự kiện xoay màn hình (Orientation)
    const handleOrientationChange = () => {
      // Trình duyệt Mobile tự xoay metadata của luồng Video WebRTC,
      // Desktop sẽ tự động nhận diện khung hình xoay ngang dọc.
      // Tuy nhiên ta có thể bắn thêm 1 lệnh nếu cần xử lý UI đặc biệt trên Desktop.
      console.log('Đã xoay màn hình:', window.screen.orientation.type);
      socket.emit('message', {
        type: 'DEVICE_COMMAND',
        payload: { action: 'ROTATE_CAMERA' },
      });
    };

    window.addEventListener('orientationchange', handleOrientationChange);

    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange);
      socket.disconnect();
      peer.destroy();
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [sessionId]);

  // HÀM BẮN LỆNH CHỤP ẢNH LÊN DESKTOP
  const handleCaptureClick = () => {
    if (socketRef.current && isReadyToCapture) {
      // Hiệu ứng rung phản hồi (Haptic Feedback) nếu thiết bị hỗ trợ
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }

      // Bắn lệnh qua Socket
      socketRef.current.emit('message', {
        type: 'DEVICE_COMMAND',
        payload: { action: 'CAPTURE' },
      });
    }
  };

  return (
    <div className="camera-viewport">
      <video ref={videoRef} className="local-video" autoPlay playsInline muted />

      {/* Badge Trạng thái nổi */}
      <div className="status-badge">{status}</div>

      {/* Thanh điều khiển hiển thị khi Camera đã sẵn sàng */}
      {isReadyToCapture && (
        <div className="camera-controls">
          <button className="capture-btn-mobile" onClick={handleCaptureClick} aria-label="Chụp ảnh">
            <div className="inner-circle"></div>
          </button>
        </div>
      )}
    </div>
  );
};
