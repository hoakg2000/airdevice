export class AirDevicePeer {
  public pc: RTCPeerConnection;
  // Biến cờ (flag) cho thuật toán Perfect Negotiation
  private makingOffer = false;
  private ignoreOffer = false;
  // Xác định ai là người nhường nhịn (Mobile) khi có xung đột
  private isPolite: boolean;

  // Callbacks để React App bắt sự kiện và gửi qua WebSocket
  public onLocalSdpReady?: (sdp: RTCSessionDescriptionInit) => void;
  public onLocalIceReady?: (ice: RTCIceCandidateInit) => void;
  // Callback để React App hiển thị Video
  public onTrackReceived?: (track: MediaStreamTrack, streams: readonly MediaStream[]) => void;

  constructor(isPolite: boolean) {
    this.isPolite = isPolite;
    // Cấu hình STUN server miễn phí của Google để tìm public IP
    this.pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    // 1. Khi trình duyệt gom được 1 ICE Candidate (Địa chỉ IP/Port)
    this.pc.onicecandidate = ({ candidate }) => {
      if (candidate && this.onLocalIceReady) {
        // Lập tức gửi Trickle ICE đi, không chờ đợi (Cực nhanh)
        this.onLocalIceReady(candidate.toJSON());
      }
    };

    // 2. Thuật toán Perfect Negotiation: Tự động thương lượng lại khi luồng media thay đổi
    this.pc.onnegotiationneeded = async () => {
      try {
        this.makingOffer = true;
        await this.pc.setLocalDescription(); // Tự động tạo Offer
        if (this.pc.localDescription && this.onLocalSdpReady) {
          this.onLocalSdpReady(this.pc.localDescription);
        }
      } catch (err) {
        console.error('Lỗi khi negotiation', err);
      } finally {
        this.makingOffer = false;
      }
    };

    // 3. Khi nhận được luồng Video/Audio từ đối phương
    this.pc.ontrack = (event) => {
      if (this.onTrackReceived) {
        this.onTrackReceived(event.track, event.streams);
      }
    };
  }

  // --- API để gọi từ bên ngoài (React) ---

  // Khi nhận SDP (Offer/Answer) từ WebSocket
  public async handleRemoteSdp(description: RTCSessionDescriptionInit) {
    try {
      // Logic chống SDP Glare (Va chạm Offer)
      const offerCollision =
        description.type === 'offer' &&
        (this.makingOffer || this.pc.signalingState !== 'stable');

      this.ignoreOffer = !this.isPolite && offerCollision;
      if (this.ignoreOffer) return; // Impolite peer sẽ lờ đi offer của Polite peer

      await this.pc.setRemoteDescription(description);

      if (description.type === 'offer') {
        // Tự động tạo Answer
        await this.pc.setLocalDescription();
        if (this.pc.localDescription && this.onLocalSdpReady) {
          this.onLocalSdpReady(this.pc.localDescription);
        }
      }
    } catch (err) {
      console.error('Lỗi xử lý Remote SDP', err);
    }
  }

  // Khi nhận ICE Candidate từ WebSocket
  public async handleRemoteIce(candidate: RTCIceCandidateInit) {
    try {
      // Phải bắt lỗi vì ICE có thể tới trước khi setRemoteDescription xong (đặc thù của Trickle ICE)
      await this.pc.addIceCandidate(candidate).catch(e => {
        if (!this.ignoreOffer) console.warn('Lỗi add ICE candidate:', e);
      });
    } catch (err) {
      console.error('Lỗi tổng quan Remote ICE', err);
    }
  }

  // Tiêm luồng Camera vào Peer
  public addLocalStream(stream: MediaStream) {
    stream.getTracks().forEach((track) => {
      if (track.kind === 'video' && 'contentHint' in track) {
        track.contentHint = 'detail';
      }

      const sender = this.pc.addTrack(track, stream);


      // Chỉ can thiệp vào luồng Video
      if (track.kind === 'video') {
        const parameters = sender.getParameters();

        if (!parameters.encodings) {
          parameters.encodings = [{}];
        }

        // Hạ từ 3000000 xuống 1500000 (1.5 Mbps)
        parameters.encodings[0].maxBitrate = 1500000;

        // 2. Tắt tính năng tự động hạ độ phân giải (Scale down)
        // Lưu ý: Có thể báo lỗi đỏ ở TypeScript vì thuộc tính này khá mới, 
        // bạn có thể phớt lờ lỗi type hoặc dùng @ts-ignore
        // @ts-ignore
        parameters.degradationPreference = 'maintain-resolution';

        // Áp dụng thông số mới
        sender.setParameters(parameters).catch(e => {
          console.warn('Trình duyệt không hỗ trợ ép parameters:', e);
        });
      }
    });
  }

  public destroy() {
    this.pc.close();
  }
}