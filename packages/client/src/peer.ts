export interface AirDevicePeerOptions {
  // Polite peer (mobile) yields on SDP glare; impolite peer (desktop) creates the DataChannel
  polite: boolean;
  iceServers?: RTCIceServer[];
}

export class AirDevicePeer {
  public pc: RTCPeerConnection;
  public channel: RTCDataChannel | null = null;
  // Perfect Negotiation flags
  private makingOffer = false;
  private ignoreOffer = false;
  private isPolite: boolean;

  public onLocalSdpReady?: (sdp: RTCSessionDescriptionInit) => void;
  public onLocalIceReady?: (ice: RTCIceCandidateInit) => void;
  public onTrackReceived?: (track: MediaStreamTrack, streams: readonly MediaStream[]) => void;
  public onChannelOpen?: (channel: RTCDataChannel) => void;
  public onConnectionStateChange?: (state: RTCPeerConnectionState) => void;

  constructor({
    polite,
    iceServers = [{ urls: 'stun:stun.l.google.com:19302' }],
  }: AirDevicePeerOptions) {
    this.isPolite = polite;
    this.pc = new RTCPeerConnection({ iceServers });
    this.setupEventHandlers();
    if (!polite) this.attachChannel(this.pc.createDataChannel('air-device'));
  }

  private attachChannel(channel: RTCDataChannel) {
    channel.binaryType = 'arraybuffer';
    channel.onopen = () => this.onChannelOpen?.(channel);
    this.channel = channel;
  }

  private setupEventHandlers() {
    // Trickle ICE: send each candidate immediately
    this.pc.onicecandidate = ({ candidate }) => {
      if (candidate) this.onLocalIceReady?.(candidate.toJSON());
    };

    // Perfect Negotiation: renegotiate automatically whenever tracks/channels change
    this.pc.onnegotiationneeded = async () => {
      try {
        this.makingOffer = true;
        await this.pc.setLocalDescription();
        if (this.pc.localDescription) this.onLocalSdpReady?.(this.pc.localDescription.toJSON());
      } catch (err) {
        console.error('[air-device] negotiation failed', err);
      } finally {
        this.makingOffer = false;
      }
    };

    this.pc.ontrack = (event) => this.onTrackReceived?.(event.track, event.streams);
    this.pc.ondatachannel = (event) => this.attachChannel(event.channel);

    this.pc.onconnectionstatechange = () => {
      // Network change (Wi-Fi <-> 4G) usually recovers with an ICE restart
      if (this.pc.connectionState === 'failed') this.pc.restartIce();
      this.onConnectionStateChange?.(this.pc.connectionState);
    };
  }

  public async handleRemoteSdp(description: RTCSessionDescriptionInit) {
    try {
      // SDP glare: both sides sent an offer at once
      const offerCollision =
        description.type === 'offer' && (this.makingOffer || this.pc.signalingState !== 'stable');

      this.ignoreOffer = !this.isPolite && offerCollision;
      if (this.ignoreOffer) return;

      await this.pc.setRemoteDescription(description);

      if (description.type === 'offer') {
        await this.pc.setLocalDescription();
        if (this.pc.localDescription) this.onLocalSdpReady?.(this.pc.localDescription.toJSON());
      }
    } catch (err) {
      console.error('[air-device] remote SDP failed', err);
    }
  }

  public async handleRemoteIce(candidate: RTCIceCandidateInit) {
    try {
      await this.pc.addIceCandidate(candidate);
    } catch (err) {
      // Candidates for an offer we ignored are expected to fail
      if (!this.ignoreOffer) console.warn('[air-device] add ICE candidate failed', err);
    }
  }

  public addLocalStream(stream: MediaStream) {
    stream.getTracks().forEach((track) => {
      const sender = this.pc.addTrack(track, stream);
      if (track.kind === 'video') this.tuneVideoSender(sender);
    });
  }

  // Swap camera (front/back) without renegotiation
  public async replaceVideoTrack(track: MediaStreamTrack) {
    const sender = this.pc.getSenders().find((s) => s.track?.kind === 'video');
    await sender?.replaceTrack(track);
  }

  private tuneVideoSender(sender: RTCRtpSender) {
    const parameters = sender.getParameters();
    if (!parameters.encodings?.length) parameters.encodings = [{}];
    parameters.encodings[0].maxBitrate = 1_500_000;
    // Keep FPS under poor network; browser lowers resolution instead (not in lib.dom typings)
    Object.assign(parameters, { degradationPreference: 'maintain-framerate' });
    sender.setParameters(parameters).catch((e) => {
      console.warn('[air-device] setParameters not supported', e);
    });
  }

  public destroy() {
    this.channel?.close();
    this.pc.close();
  }
}
