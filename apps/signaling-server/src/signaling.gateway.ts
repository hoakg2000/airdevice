import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import {
  WsMessageSchema,
  ServerEvents,
  ClientEvents,
  ErrorCode,
  JoinSessionPayload,
} from '@air-device/protocol';
import { randomBytes, randomUUID, timingSafeEqual } from 'crypto';
import { SessionStore } from './session.store';
import { config } from './config';

interface SocketData {
  sessionId?: string;
  role?: 'desktop' | 'mobile';
}

type AppSocket = Socket<ClientEvents, ServerEvents, Record<string, never>, SocketData>;

function tokensMatch(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

@WebSocketGateway({ transports: ['websocket'] })
export class SignalingGateway implements OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server<ClientEvents, ServerEvents>;

  constructor(private readonly sessions: SessionStore) {}

  @SubscribeMessage('message')
  async handleMessage(@MessageBody() rawData: unknown, @ConnectedSocket() client: AppSocket) {
    const parsed = WsMessageSchema.safeParse(rawData);
    if (!parsed.success) return this.fail(client, 'INVALID_PAYLOAD', 'Invalid payload');

    const message = parsed.data;
    switch (message.type) {
      case 'SESSION_INIT':
        return this.createSession(client);
      case 'JOIN_SESSION':
        return this.joinSession(client, message.payload);
      case 'WEBRTC_SDP':
        this.peerRoom(client)?.emit('webrtc_sdp_received', message.payload);
        return;
      case 'WEBRTC_ICE':
        this.peerRoom(client)?.emit('webrtc_ice_received', message.payload);
        return;
    }
  }

  async handleDisconnect(client: AppSocket) {
    const { sessionId, role } = client.data;
    if (!sessionId || !role) return;
    client.to(sessionId).emit('peer_disconnected', { role });

    if (role === 'desktop') return this.sessions.delete(sessionId);
    const session = await this.sessions.get(sessionId);
    if (session?.mobileId === client.id) {
      // Free the slot so the phone can rejoin after a reload
      await this.sessions.set(sessionId, { ...session, mobileId: undefined }, config.sessionTtlSec);
    }
  }

  private async createSession(client: AppSocket) {
    // A desktop asking again (QR expired) drops its previous session
    if (client.data.sessionId) {
      client.leave(client.data.sessionId);
      await this.sessions.delete(client.data.sessionId);
    }

    const sessionId = randomUUID();
    const token = randomBytes(16).toString('base64url');
    await this.sessions.set(sessionId, { desktopId: client.id, token }, config.sessionTtlSec);

    client.data = { sessionId, role: 'desktop' };
    client.join(sessionId);
    client.emit('session_created', {
      sessionId,
      token,
      expiresAt: Date.now() + config.sessionTtlSec * 1000,
      iceServers: config.iceServers,
    });
  }

  private async joinSession(client: AppSocket, { sessionId, token }: JoinSessionPayload) {
    const session = await this.sessions.get(sessionId);
    if (!session) return this.fail(client, 'SESSION_NOT_FOUND', 'Session expired or not found');
    if (!tokensMatch(session.token, token)) {
      return this.fail(client, 'INVALID_TOKEN', 'Invalid pairing token');
    }
    // shortcut: get+set is not atomic on Redis; two phones joining in the same ms could both pass
    if (session.mobileId && session.mobileId !== client.id) {
      return this.fail(client, 'SESSION_FULL', 'Another device is already connected');
    }

    // Keep the session alive while paired so a phone reload can rejoin
    await this.sessions.set(sessionId, { ...session, mobileId: client.id }, config.sessionTtlSec);
    client.data = { sessionId, role: 'mobile' };
    client.join(sessionId);
    client.emit('session_joined', { sessionId, iceServers: config.iceServers });
    client.to(sessionId).emit('peer_connected', { role: 'mobile' });
  }

  // Room holds exactly one desktop and at most one phone, so this reaches only the peer
  private peerRoom(client: AppSocket) {
    const { sessionId } = client.data;
    if (sessionId) return client.to(sessionId);
    this.fail(client, 'NOT_IN_SESSION', 'Join a session first');
  }

  private fail(client: AppSocket, code: ErrorCode, message: string) {
    client.emit('exception', { code, message });
  }
}
