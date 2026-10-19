air-device/
├── apps/
│ ├── signaling-server/ # NestJS: sessions, WebRTC signaling relay, serves the phone page at /m/
│ └── mobile-client/ # React phone page: camera, torch, switch camera, photo over DataChannel
├── packages/
│ ├── element/ # <air-device> web component (npm: @air-device/element)
│ ├── client/ # Headless SDK: AirDevicePeer, HostSession, CameraSession (npm: @air-device/client)
│ ├── protocol/ # Zod schemas + types (npm: @air-device/protocol)
│ └── config/ # Shared tsconfig
├── docker/
│ ├── docker-compose.yml # Server + optional Redis
│ └── redis/ # redis.conf
├── Dockerfile # Server + phone page image
├── package.json # Workspace config
└── pnpm-workspace.yaml # pnpm workspace definition
