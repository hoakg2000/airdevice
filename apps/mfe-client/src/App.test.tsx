import { render, screen } from '@testing-library/react';
import { App } from './App';
import { vi } from 'vitest';

// 1. Mock Socket.io để nó không thực sự kết nối ra mạng
vi.mock('socket.io-client', () => {
  return {
    io: vi.fn(() => ({
      on: vi.fn(),
      emit: vi.fn(),
      disconnect: vi.fn(),
    })),
  };
});

// 2. Mock WebRTC Core vì JSDOM không hỗ trợ RTCPeerConnection
vi.mock('@air-device/webrtc-core', () => {
  return {
    AirDevicePeer: vi.fn().mockImplementation(() => ({
      destroy: vi.fn(),
    })),
};
});

describe('MFE Desktop App', () => {
  it('Hiển thị trạng thái "Đang khởi tạo kết nối" lúc ban đầu', () => {
    render(<App />);
    
    // Tìm thẻ có chứa text khởi tạo
    const loadingText = screen.getByText(/Vui lòng chờ, đang khởi tạo kết nối/i);
    
    // Khẳng định nó xuất hiện trên màn hình
    expect(loadingText).toBeInTheDocument();
  });
});