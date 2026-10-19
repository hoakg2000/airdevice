import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AirDevicePeer } from './peer';

class FakePeerConnection {
  signalingState: RTCSignalingState = 'stable';
  connectionState: RTCPeerConnectionState = 'new';
  localDescription: { toJSON: () => RTCSessionDescriptionInit } | null = null;
  setRemoteDescription = vi.fn(async (d: RTCSessionDescriptionInit) => {
    this.signalingState = d.type === 'offer' ? 'have-remote-offer' : 'stable';
  });
  setLocalDescription = vi.fn(async () => {
    const type = this.signalingState === 'have-remote-offer' ? 'answer' : 'offer';
    this.signalingState = type === 'offer' ? 'have-local-offer' : 'stable';
    this.localDescription = { toJSON: () => ({ type, sdp: type }) };
  });
  addIceCandidate = vi.fn(async () => {});
  createDataChannel = vi.fn(() => ({}) as RTCDataChannel);
  restartIce = vi.fn();
  close = vi.fn();
  onconnectionstatechange: (() => void) | null = null;
}

describe('AirDevicePeer perfect negotiation', () => {
  beforeEach(() => vi.stubGlobal('RTCPeerConnection', FakePeerConnection));

  it('impolite peer (desktop) ignores a colliding offer', async () => {
    const peer = new AirDevicePeer({ polite: false });
    const pc = peer.pc as unknown as FakePeerConnection;
    pc.signalingState = 'have-local-offer';
    await peer.handleRemoteSdp({ type: 'offer', sdp: 'x' });
    expect(pc.setRemoteDescription).not.toHaveBeenCalled();
  });

  it('polite peer (phone) accepts a colliding offer and answers', async () => {
    const peer = new AirDevicePeer({ polite: true });
    const pc = peer.pc as unknown as FakePeerConnection;
    const onLocalSdpReady = vi.fn();
    peer.onLocalSdpReady = onLocalSdpReady;
    pc.signalingState = 'have-local-offer';
    await peer.handleRemoteSdp({ type: 'offer', sdp: 'x' });
    expect(pc.setRemoteDescription).toHaveBeenCalled();
    expect(onLocalSdpReady).toHaveBeenCalledWith({ type: 'answer', sdp: 'answer' });
  });

  it('only the impolite peer creates the DataChannel', () => {
    const desktop = new AirDevicePeer({ polite: false });
    const phone = new AirDevicePeer({ polite: true });
    expect((desktop.pc as unknown as FakePeerConnection).createDataChannel).toHaveBeenCalled();
    expect((phone.pc as unknown as FakePeerConnection).createDataChannel).not.toHaveBeenCalled();
  });

  it('restarts ICE when the connection fails', () => {
    const peer = new AirDevicePeer({ polite: true });
    const pc = peer.pc as unknown as FakePeerConnection;
    pc.connectionState = 'failed';
    pc.onconnectionstatechange?.();
    expect(pc.restartIce).toHaveBeenCalled();
  });
});
