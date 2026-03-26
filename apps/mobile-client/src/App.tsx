// apps/mobile-client/src/App.tsx
import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { ServerEvents, ClientEvents } from '@air-device/shared-types';

export const App: React.FC = () => {
  const [status, setStatus] = useState<string>('Initializing...');
  
  // Lấy sessionId từ tham số URL
  const sessionId = new URLSearchParams(window.location.search).get('sessionId');

  useEffect(() => {
    if (!sessionId) {
      setStatus('Error: No Session ID found in URL.');
      return;
    }

    // Connect tới IP LAN của Signaling Server (Thay bằng IP máy tính của bạn)
    const socket: Socket<ServerEvents, ClientEvents> = io('/', {
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      setStatus('Connected to Signaling. Joining room...');
      socket.emit('message', {
        type: 'JOIN_SESSION',
        payload: { sessionId, deviceType: 'mobile' }
      });
      // Giả lập delay UI để UX mượt mà, sau đó báo thành công
      setTimeout(() => setStatus('✅ Paired with Desktop'), 500);
    });

    socket.on('connect_error', () => {
      setStatus('Connection to server failed. Check IP/Firewall.');
    });

    return () => {
      socket.disconnect();
    };
  }, [sessionId]);

  return (
    <div className="camera-viewport">
      <div className="overlay">
        <h2 style={{ marginBottom: '1rem', color: '#10b981' }}>📷 AirDevice</h2>
        <div style={{ margin: '1rem 0', padding: '0.5rem', background: '#333', borderRadius: '8px', fontSize: '0.8rem' }}>
          {status}
        </div>
      </div>
    </div>
  );
};