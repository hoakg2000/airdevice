// apps/signaling-server/src/signaling.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { WsMessageSchema, ServerEvents, ClientEvents } from '@air-device/shared-types';
import { randomUUID } from 'crypto';

@WebSocketGateway({
  cors: { origin: '*' },
  transports: ['websocket'],
})
export class SignalingGateway {
  // Gắn type nghiêm ngặt cho Server để IDE tự gợi ý
  @WebSocketServer()
  server!: Server<ClientEvents, ServerEvents>;

  @SubscribeMessage('message')
  handleMessage(
    @MessageBody() rawData: any,
    @ConnectedSocket() client: Socket,
  ) {
    const parsed = WsMessageSchema.safeParse(rawData);
    if (!parsed.success) {
      client.emit('exception', { status: 'error', message: 'Invalid payload' });
      return;
    }

    const message = parsed.data;

    switch (message.type) {
      case 'SESSION_INIT': {
        const sessionId = randomUUID();
        // Desktop join vào Room mang tên là sessionId
        client.join(sessionId);
        client.emit('session_created', { sessionId });
        console.log(`[+] Desktop created session: ${sessionId}`);
        break;
      }

      case 'JOIN_SESSION': {
        const { sessionId } = message.payload;
        // Mobile join vào chung Room với Desktop
        client.join(sessionId);
        // Broadcast vào room (trừ người gửi) rằng có thiết bị mới vào
        client.to(sessionId).emit('peer_connected', { message: 'Mobile device joined' });
        console.log(`[+] Mobile joined session: ${sessionId}`);
        break;
      }
    }
  }
}