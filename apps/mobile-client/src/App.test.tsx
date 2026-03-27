// apps/mobile-client/src/App.test.tsx
import { render, screen } from '@testing-library/react';
import { App } from './App';
import { vi } from 'vitest';

// Mock Socket.io
vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    on: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
  })),
}));

// Mock WebRTC Core
vi.mock('@air-device/webrtc-core', () => ({
  AirDevicePeer: vi.fn().mockImplementation(() => ({
    destroy: vi.fn(),
    addLocalStream: vi.fn(),
  })),
}));

describe('Mobile Client App', () => {
  it('Hiển thị lỗi nếu truy cập mà không có Session ID trên URL', () => {
    // Giả lập URL hiện tại không có query param `?sessionId=...`
    Object.defineProperty(window, 'location', {
      value: { search: '' },
      writable: true,
    });

    render(<App />);
    
    // Tìm thẻ chứa text thông báo lỗi
    const errorMsg = screen.getByText(/Lỗi: Không tìm thấy Session ID/i);
    expect(errorMsg).toBeInTheDocument();
  });
});