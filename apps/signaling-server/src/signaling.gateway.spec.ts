import { SignalingGateway } from './signaling.gateway';
import { MemorySessionStore } from './session.store';

interface FakeSocket {
  id: string;
  data: Record<string, unknown>;
  rooms: Set<string>;
  emit: jest.Mock;
  join: jest.Mock;
  leave: jest.Mock;
  to: (room: string) => { emit: (event: string, data: unknown) => void };
}

// Minimal socket.io socket double: tracks rooms and routes `to(room).emit` to members
function createHub() {
  const sockets: FakeSocket[] = [];
  const createSocket = (id: string) => {
    const socket: FakeSocket = {
      id,
      data: {} as Record<string, unknown>,
      rooms: new Set<string>([id]),
      emit: jest.fn(),
      join: jest.fn((room: string) => socket.rooms.add(room)),
      leave: jest.fn((room: string) => socket.rooms.delete(room)),
      to: (room: string) => ({
        emit: (event: string, data: unknown) =>
          sockets
            .filter((s) => s !== socket && s.rooms.has(room))
            .forEach((s) => s.emit(event, data)),
      }),
    };
    sockets.push(socket);
    return socket;
  };
  return { createSocket };
}

const lastPayload = (socket: FakeSocket, event: string) =>
  socket.emit.mock.calls.filter(([name]: [string]) => name === event).at(-1)?.[1];

describe('SignalingGateway', () => {
  let gateway: SignalingGateway;
  let hub: ReturnType<typeof createHub>;

  const send = (socket: FakeSocket, message: unknown) =>
    gateway.handleMessage(message, socket as never);

  const createDesktop = async (id: string) => {
    const desktop = hub.createSocket(id);
    await send(desktop, { type: 'SESSION_INIT', payload: { deviceType: 'desktop' } });
    return { desktop, ...lastPayload(desktop, 'session_created') };
  };

  const join = (socket: FakeSocket, sessionId: string, token: string) =>
    send(socket, { type: 'JOIN_SESSION', payload: { sessionId, token, deviceType: 'mobile' } });

  beforeEach(() => {
    gateway = new SignalingGateway(new MemorySessionStore());
    hub = createHub();
  });

  it('rejects invalid payloads', async () => {
    const socket = hub.createSocket('s1');
    await send(socket, { type: 'NOPE' });
    expect(lastPayload(socket, 'exception')).toMatchObject({ code: 'INVALID_PAYLOAD' });
  });

  it('gives each desktop a unique session id and token', async () => {
    const a = await createDesktop('d1');
    const b = await createDesktop('d2');
    expect(a.sessionId).not.toEqual(b.sessionId);
    expect(a.token).not.toEqual(b.token);
    expect(a.iceServers.length).toBeGreaterThan(0);
  });

  it('pairs a phone with the right token', async () => {
    const { desktop, sessionId, token } = await createDesktop('d1');
    const phone = hub.createSocket('m1');
    await join(phone, sessionId, token);
    expect(lastPayload(phone, 'session_joined')).toMatchObject({ sessionId });
    expect(lastPayload(desktop, 'peer_connected')).toEqual({ role: 'mobile' });
  });

  it('rejects a wrong token and unknown sessions', async () => {
    const { desktop, sessionId } = await createDesktop('d1');
    const phone = hub.createSocket('m1');
    await join(phone, sessionId, 'x'.repeat(22));
    expect(lastPayload(phone, 'exception')).toMatchObject({ code: 'INVALID_TOKEN' });
    await join(phone, '00000000-0000-4000-8000-000000000000', 'x'.repeat(22));
    expect(lastPayload(phone, 'exception')).toMatchObject({ code: 'SESSION_NOT_FOUND' });
    expect(lastPayload(desktop, 'peer_connected')).toBeUndefined();
  });

  it('rejects a second phone', async () => {
    const { sessionId, token } = await createDesktop('d1');
    await join(hub.createSocket('m1'), sessionId, token);
    const intruder = hub.createSocket('m2');
    await join(intruder, sessionId, token);
    expect(lastPayload(intruder, 'exception')).toMatchObject({ code: 'SESSION_FULL' });
  });

  it('relays SDP only inside the session', async () => {
    const a = await createDesktop('d1');
    const b = await createDesktop('d2');
    const phoneA = hub.createSocket('m1');
    await join(phoneA, a.sessionId, a.token);

    const sdp = { type: 'offer', sdp: 'v=0' };
    await send(phoneA, { type: 'WEBRTC_SDP', payload: sdp });
    expect(lastPayload(a.desktop, 'webrtc_sdp_received')).toEqual(sdp);
    expect(lastPayload(b.desktop, 'webrtc_sdp_received')).toBeUndefined();
  });

  it('refuses to relay for sockets outside a session', async () => {
    const stranger = hub.createSocket('x1');
    await send(stranger, { type: 'WEBRTC_ICE', payload: { candidate: 'c' } });
    expect(lastPayload(stranger, 'exception')).toMatchObject({ code: 'NOT_IN_SESSION' });
  });

  it('frees the phone slot on disconnect so the phone can rejoin', async () => {
    const { desktop, sessionId, token } = await createDesktop('d1');
    const phone = hub.createSocket('m1');
    await join(phone, sessionId, token);
    await gateway.handleDisconnect(phone as never);
    expect(lastPayload(desktop, 'peer_disconnected')).toEqual({ role: 'mobile' });

    const reloaded = hub.createSocket('m2');
    await join(reloaded, sessionId, token);
    expect(lastPayload(reloaded, 'session_joined')).toBeDefined();
  });

  it('ends the session when the desktop leaves', async () => {
    const { desktop, sessionId, token } = await createDesktop('d1');
    const phone = hub.createSocket('m1');
    await join(phone, sessionId, token);
    await gateway.handleDisconnect(desktop as never);
    expect(lastPayload(phone, 'peer_disconnected')).toEqual({ role: 'desktop' });

    const late = hub.createSocket('m2');
    await join(late, sessionId, token);
    expect(lastPayload(late, 'exception')).toMatchObject({ code: 'SESSION_NOT_FOUND' });
  });

  it('invalidates the old QR when the desktop regenerates', async () => {
    const first = await createDesktop('d1');
    await send(first.desktop, { type: 'SESSION_INIT', payload: { deviceType: 'desktop' } });
    const phone = hub.createSocket('m1');
    await join(phone, first.sessionId, first.token);
    expect(lastPayload(phone, 'exception')).toMatchObject({ code: 'SESSION_NOT_FOUND' });
  });
});

describe('MemorySessionStore', () => {
  it('expires sessions after their TTL', async () => {
    jest.useFakeTimers();
    const store = new MemorySessionStore();
    await store.set('s', { desktopId: 'd', token: 't' }, 1);
    expect(await store.get('s')).not.toBeNull();
    jest.advanceTimersByTime(1500);
    expect(await store.get('s')).toBeNull();
    jest.useRealTimers();
  });
});
