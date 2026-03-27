import { Test, TestingModule } from '@nestjs/testing';
import { SignalingGateway } from './signaling.gateway';
import { Socket } from 'socket.io';

describe('SignalingGateway', () => {
  let gateway: SignalingGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SignalingGateway],
    }).compile();

    gateway = module.get<SignalingGateway>(SignalingGateway);
    // Mock đối tượng Server của Socket.io
    gateway.server = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    } as any;
  });

  it('Gateway phải được khởi tạo', () => {
    expect(gateway).toBeDefined();
  });

  it('Desktop phải tạo được SessionID và tham gia Room', () => {
    // 1. Tạo một Mock Client (Giả lập Desktop MFE)
    const mockClient = {
      id: 'desktop-socket-123',
      join: jest.fn(),
      emit: jest.fn(),
    } as unknown as Socket;

    // 2. Định nghĩa Payload gửi lên
    const payload = {
      type: 'SESSION_INIT',
      payload: { deviceType: 'desktop' }
    };

    // 3. Thực thi hàm
    gateway.handleMessage(payload, mockClient);

    // 4. Kiểm tra (Assertions)
    expect(mockClient.join).toHaveBeenCalled(); // Đảm bảo đã gọi lệnh join room
    expect(mockClient.emit).toHaveBeenCalledWith('session_created', expect.any(Object)); // Đảm bảo server đã trả về session_created
  });
});