// apps/mobile-client/src/setupTests.ts
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// 1. Mock API Camera của Trình duyệt
Object.defineProperty(global.navigator, 'mediaDevices', {
  value: {
    getUserMedia: vi.fn().mockResolvedValue({
      // Giả lập một MediaStream trả về có chứa 1 track (để hàm track.stop() không bị lỗi)
      getTracks: () => [{ stop: vi.fn(), kind: 'video' }],
    }),
  },
});

// 2. Mock API Vibrate (Rung điện thoại)
Object.defineProperty(global.navigator, 'vibrate', {
  value: vi.fn(),
});