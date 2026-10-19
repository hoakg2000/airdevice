import { io, type Socket } from 'socket.io-client';
import type { ClientEvents, ErrorCode, ServerEvents } from '@air-device/protocol';
import { AirDevicePeer } from './peer';
import { createChannelReceiver, sendBlob } from './channel';
import { sdpPayload } from './host';

export type CameraState = 'connecting' | 'paired' | 'ended' | 'error';

export interface CameraSessionOptions {
  sessionId: string;
  token: string;
  // Signaling server; defaults to the page's own origin (mobile app served by the server)
  serverUrl?: string;
}

// Reads `#s=<sessionId>&t=<token>` written into the QR code by HostSession
export function parsePairingHash(hash: string): { sessionId: string; token: string } | null {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const sessionId = params.get('s');
  const token = params.get('t');
  return sessionId && token ? { sessionId, token } : null;
}

// Phone side: joins a session and streams the camera to the desktop
export class CameraSession {
  public onState?: (state: CameraState) => void;
  public onCaptureRequest?: () => void;
  public onError?: (code: ErrorCode | 'CONNECTION_FAILED', message: string) => void;

  private socket: Socket<ServerEvents, ClientEvents> | null = null;
  private peer: AirDevicePeer | null = null;

  constructor(
    private options: CameraSessionOptions,
    private stream: MediaStream,
  ) {}

  public start() {
    const socket: Socket<ServerEvents, ClientEvents> = io(this.options.serverUrl ?? '/', {
      transports: ['websocket'],
    });
    this.socket = socket;
    this.onState?.('connecting');

    // Also runs after socket.io auto-reconnects, so the phone rejoins by itself
    socket.on('connect', () => {
      const { sessionId, token } = this.options;
      socket.emit('message', {
        type: 'JOIN_SESSION',
        payload: { sessionId, token, deviceType: 'mobile' },
      });
    });
    socket.on('connect_error', (err) => this.onError?.('CONNECTION_FAILED', err.message));
    socket.on('disconnect', () => {
      this.resetPeer();
      this.onState?.('connecting');
    });

    socket.on('session_joined', ({ iceServers }) => {
      this.resetPeer();
      this.peer = this.createPeer(iceServers);
      this.onState?.('paired');
    });

    socket.on('peer_disconnected', ({ role }) => {
      if (role !== 'desktop') return;
      this.resetPeer();
      this.onState?.('ended');
      socket.disconnect();
    });

    socket.on('webrtc_sdp_received', (sdp) => this.peer?.handleRemoteSdp(sdp));
    socket.on('webrtc_ice_received', (ice) => this.peer?.handleRemoteIce(ice));
    socket.on('exception', ({ code, message }) => {
      this.onError?.(code, message);
      if (code === 'SESSION_NOT_FOUND' || code === 'INVALID_TOKEN' || code === 'SESSION_FULL') {
        this.onState?.('error');
        socket.disconnect();
      }
    });
  }

  private createPeer(iceServers: RTCIceServer[]) {
    const socket = this.socket!;
    const peer = new AirDevicePeer({ polite: true, iceServers });
    peer.onLocalSdpReady = (sdp) =>
      socket.emit('message', { type: 'WEBRTC_SDP', payload: sdpPayload(sdp) });
    peer.onLocalIceReady = (ice) =>
      socket.emit('message', {
        type: 'WEBRTC_ICE',
        payload: { ...ice, candidate: ice.candidate ?? '' },
      });
    peer.onChannelOpen = (channel) => {
      channel.onmessage = createChannelReceiver({
        onMessage: (message) => {
          if (message.type === 'CAPTURE') this.onCaptureRequest?.();
        },
      });
    };
    peer.addLocalStream(this.stream);
    return peer;
  }

  private resetPeer() {
    this.peer?.destroy();
    this.peer = null;
  }

  // Switch to a new camera stream (e.g. front/back) without renegotiation
  public async setStream(stream: MediaStream) {
    this.stream = stream;
    const track = stream.getVideoTracks()[0];
    if (track) await this.peer?.replaceVideoTrack(track);
  }

  public async sendPhoto(photo: Blob): Promise<boolean> {
    const channel = this.peer?.channel;
    if (channel?.readyState !== 'open') return false;
    await sendBlob(channel, photo);
    return true;
  }

  public destroy() {
    this.resetPeer();
    this.socket?.disconnect();
    this.socket = null;
  }
}
