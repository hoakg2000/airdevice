sequenceDiagram
    participant MFE as Desktop (MFE)
    participant GW as NestJS Gateway
    participant REDIS as Redis Cluster
    participant MOB as Mobile (PWA)

    MFE->>GW: WSS: { type: 'SESSION_INIT' }
    GW->>GW: Generate UUID (SessionID)
    GW->>REDIS: join Room(SessionID)
    GW-->>MFE: WSS: { type: 'SESSION_CREATED', sessionId }
    Note left of MFE: Render QR Code
    MOB->>GW: WSS: { type: 'JOIN_SESSION', sessionId }
    GW->>REDIS: join Room(SessionID)
    GW->>REDIS: broadcast to Room(SessionID)
    REDIS-->>MFE: WSS: { type: 'PEER_CONNECTED' }
    Note left of MFE: UI -> "Device Connected"