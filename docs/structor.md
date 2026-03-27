air-device/
├── apps/
│   ├── signaling-server/       # NestJS Backend: Quản lý Session, WebSocket Gateway, WebRTC Signaling
│   ├── mfe-client/             # React MFE: Bundle thành 1 file .js duy nhất, dùng Shadow DOM
│   └── mobile-client/          # React PWA: UI trên điện thoại, truy cập Camera/Mic (MediaRecorder)
├── packages/
│   ├── shared-types/           # TypeScript Interfaces, Zod Schemas hoặc Protobuf defs (AI-Ready)
│   ├── webrtc-core/            # Xử lý logic WebRTC, SDP negotiation, STUN/TURN configs chung
│   └── config/                 # ESLint, Prettier, TSConfig base dùng chung cho toàn monorepo
├── docker/
│   ├── docker-compose.yml      # Cấu hình Local dev (Redis, Backend, Traefik/Nginx)
│   ├── redis/                  # Custom redis.conf (tối ưu memory eviction)
│   └── turn-server/            # Cấu hình Coturn (nếu tự host STUN/TURN)
├── package.json                # Workspace config
└── pnpm-workspace.yaml         # Pnpm workspace definition