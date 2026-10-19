import { io, type Socket } from 'socket.io-client';
import type { ClientEvents, ErrorCode, ServerEvents } from '@air-device/protocol';
import { AirDevicePeer } from './peer';
import { createChannelReceiver, sendMessage } from './channel';

export type HostState = 'connecting' | 'waiting' | 'paired' | 'error';

export interface HostSessionOptions {
  serverUrl: string;
  // Page the phone opens; defaults to the mobile app served by the server at /m/
  mobileUrl?: string;
}

export interface PairingInfo {
  url: string;
  sessionId: string;
  expiresAt: number;
}

// Desktop side: creates a session, shows pairing info, receives video and photos
export class HostSession {
  public onState?: (state: HostState) => void;
  public onPairing?: (info: PairingInfo) => void;
  public onStream?: (stream: MediaStream | null) => void;
  public onPhoto?: (photo: Blob) => void;
  public onError?: (code: ErrorCode | 'CONNECTION_FAILED', message: string) => void;

  private socket: Socket<ServerEvents, ClientEvents> | null = null;
  private peer: AirDevicePeer | null = null;
  private iceServers: RTCIceServer[] = [];

  constructor(private options: HostSessionOptions) {}

  public start() {
    const { serverUrl } = this.options;
    const mobileUrl = this.options.mobileUrl || new URL('/m/', serverUrl).href;
    const socket: Socket<ServerEvents, ClientEvents> = io(serverUrl, {
      transports: ['websocket'],
    });
    this.socket = socket;
    this.onState?.('connecting');

    socket.on('connect', () => this.regenerate());
    socket.on('connect_error', (err) => {
      this.onState?.('error');
      this.onError?.('CONNECTION_FAILED', err.message);
    });
    socket.on('disconnect', () => {
      this.resetPeer();
      this.onState?.('connecting');
    });

    socket.on('session_created', ({ sessionId, token, expiresAt, iceServers }) => {
      this.iceServers = iceServers;
      // Fragment (#) keeps the token out of server logs and Referer headers
      const url = `${mobileUrl}#s=${sessionId}&t=${encodeURIComponent(token)}`;
      this.onPairing?.({ url, sessionId, expiresAt });
      this.onState?.('waiting');
    });

    socket.on('peer_connected', () => {
      this.resetPeer();
      this.peer = this.createPeer();
      this.onState?.('paired');
    });

    socket.on('peer_disconnected', () => {
      this.resetPeer();
      this.onState?.('waiting');
    });

    socket.on('webrtc_sdp_received', (sdp) => this.peer?.handleRemoteSdp(sdp));
    socket.on('webrtc_ice_received', (ice) => this.peer?.handleRemoteIce(ice));
    socket.on('exception', ({ code, message }) => this.onError?.(code, message));
  }

  private createPeer() {
    const socket = this.socket!;
    const peer = new AirDevicePeer({ polite: false, iceServers: this.iceServers });
    peer.onLocalSdpReady = (sdp) =>
      socket.emit('message', { type: 'WEBRTC_SDP', payload: sdpPayload(sdp) });
    peer.onLocalIceReady = (ice) =>
      socket.emit('message', {
        type: 'WEBRTC_ICE',
        payload: { ...ice, candidate: ice.candidate ?? '' },
      });
    peer.onTrackReceived = (track, streams) =>
      this.onStream?.(streams[0] ?? new MediaStream([track]));
    peer.onChannelOpen = (channel) => {
      channel.onmessage = createChannelReceiver({ onPhoto: (blob) => this.onPhoto?.(blob) });
    };
    return peer;
  }

  private resetPeer() {
    this.peer?.destroy();
    this.peer = null;
    this.onStream?.(null);
  }

  // Asks the phone for a full-resolution photo. Returns false when no channel is open,
  // so the caller can fall back to grabbing a frame from the video stream.
  public capture(): boolean {
    const channel = this.peer?.channel;
    if (channel?.readyState !== 'open') return false;
    sendMessage(channel, { type: 'CAPTURE' });
    return true;
  }

  // Requests a new session id + token (e.g. after the QR code expired)
  public regenerate() {
    this.socket?.emit('message', {
      type: 'SESSION_INIT',
      payload: { deviceType: 'desktop', userAgent: navigator.userAgent.slice(0, 512) },
    });
  }

  public destroy() {
    this.resetPeer();
    this.socket?.disconnect();
    this.socket = null;
  }
}

export function sdpPayload(sdp: RTCSessionDescriptionInit) {
  return { type: sdp.type, sdp: sdp.sdp ?? '' };
}
