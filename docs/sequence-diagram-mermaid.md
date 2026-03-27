sequenceDiagram
participant M as Desktop MFE (React)
participant S as Signaling Server (NestJS)
participant P as Mobile PWA (React)

    Note over M, P: Phase 7: Session Handshake
    M->>S: 1. WSS: SESSION_INIT
    S-->>M: 2. WSS: SessionID Created (Render QR)
    Note over P: User scans QR code
    P->>S: 3. WSS: JOIN_SESSION (SessionID)
    S-->>M: 4. WSS: Mobile Connected

    Note over M, P: Phase 8 & 9: WebRTC Negotiation (Trickle ICE)
    M->>P: 5. WSS: SDP Offer
    P->>M: 6. WSS: SDP Answer
    M->>P: 7. WSS: ICE Candidates
    P->>M: 8. WSS: ICE Candidates

    Note over M, P: Phase 10: P2P Media Streaming
    P->>M: 9. WebRTC (P2P): MediaStreamTrack (Camera/Mic)
