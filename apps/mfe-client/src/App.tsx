// apps/mfe-client/src/App.tsx
import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { QRCodeSVG } from 'qrcode.react';
import { ServerEvents, ClientEvents } from '@air-device/shared-types';

export const App: React.FC = () => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [peerConnected, setPeerConnected] = useState(false);

  useEffect(() => {
    // Ép type chặt chẽ cho Socket
    const socket: Socket<ServerEvents, ClientEvents> = io('http://localhost:3000', {
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      setIsConnected(true);
      // Khi connect thành công, lập tức xin cấp SessionID
      socket.emit('message', {
        type: 'SESSION_INIT',
        payload: { deviceType: 'desktop' }
      });
    });

    socket.on('session_created', (data) => {
      setSessionId(data.sessionId);
    });

    socket.on('peer_connected', () => {
      setPeerConnected(true);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // IP của Mobile App (Thay bằng IP LAN của bạn ở Phase 5, ví dụ: https://192.168.1.15:5174)
  const mobileAppUrl = `https://192.168.1.4:5174/?sessionId=${sessionId}`;

  return (
    <div className="air-device-host">
      {!isConnected ? (
        <h3 className="standby-text pulse">Connecting to server...</h3>
      ) : peerConnected ? (
        <div style={{ color: '#10b981' }}>
          <h3>✅ Device Connected</h3>
          <p>WebRTC stream ready to start.</p>
        </div>
      ) : sessionId ? (
        <div>
          <h3 className="standby-text">Scan to Connect</h3>
          <div style={{ background: 'white', padding: '10px', display: 'inline-block', borderRadius: '8px' }}>
            <QRCodeSVG value={mobileAppUrl} size={150} />
          </div>
          <h5>{mobileAppUrl}</h5>
          <p style={{ fontSize: '0.8rem', marginTop: '10px' }}>Session: {sessionId.split('-')[0]}...</p>
        </div>
      ) : (
        <h3 className="standby-text pulse">Initializing Session...</h3>
      )}
    </div>
  );
};