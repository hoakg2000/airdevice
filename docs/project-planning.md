# Kế hoạch Setup Skeleton "Air-Device"

## Mục lục

- [Phase 1: Workspace Foundation & Core Configs (Tầng Nền tảng)](#phase-1-workspace-foundation--core-configs-tầng-nền-tảng)
- [Phase 2: Shared Contracts (Tầng Giao thức)](#phase-2-shared-contracts-tầng-giao-thức)
- [Phase 3: Infrastructure (Tầng Hạ tầng cục bộ)](#phase-3-infrastructure-tầng-hạ-tầng-cục-bộ)
- [Phase 4: MFE Web Component (Tầng Client Desktop)](#phase-4-mfe-web-component-tầng-client-desktop)
- [Phase 5: Mobile PWA Client (Tầng Ngoại vi)](#phase-5-mobile-pwa-client-tầng-ngoại-vi)
- [Phase 6: Signaling Gateway (Tầng Backend)](#phase-6-signaling-gateway-tầng-backend)
- [Phase 7: The Session Handshake (Tích hợp WebSocket Client)](#phase-7-the-session-handshake-tích-hợp-websocket-client)
- [Phase 8: WebRTC Core (Tầng Giao thức P2P)](#phase-8-webrtc-core-tầng-giao-thức-p2p)
- [Phase 9: Mobile Media Capture (Tầng Ngoại vi)](#phase-9-mobile-media-capture-tầng-ngoại-vi)
- [Phase 10: MFE Media Render & Host API (Tầng Tích hợp)](#phase-10-mfe-media-render--host-api-tầng-tích-hợp)

---

## Phase 1: Workspace Foundation & Core Configs (Tầng Nền tảng)

- Root Configuration: Hoàn thiện `pnpm-workspace.yaml` và `package.json` gốc. Thiết lập engine strict (Node >= 20, pnpm >= 8).
- Shared TS/ESLint Config (`packages/config`): Tạo `tsconfig.base.json` với `compilerOptions` tối ưu cho Monorepo (sử dụng `composite: true` hoặc `path mapping`) để chia sẻ type mượt mà mà không cần build step phức tạp.

## Phase 2: Shared Contracts (Tầng Giao thức)

- Khởi tạo `packages/shared-types`: Setup `package.json` cho module này.
- Skeleton Types: Định nghĩa một vài Zod schema cơ bản (VD: `SessionInit`, `Ping`) và export chúng. Mục đích là để test việc Import xuyên module (từ Frontend và Backend trỏ về gói shared này) xem pnpm symlink đã hoạt động đúng chưa.

## Phase 3: Infrastructure (Tầng Hạ tầng cục bộ)

- Docker Compose (`docker/docker-compose.yml`): Viết script dựng Redis container (alpine, minimal footprint) để làm Pub/Sub backend cho NestJS.

## Phase 4: MFE Web Component (Tầng Client Desktop)

- Khởi tạo React/Vite: Setup `apps/mfe-client`.
- Vite Single-Bundle Config: Ghi đè cấu hình Rollup bên trong Vite để vô hiệu hóa code-splitting. Ép xuất ra duy nhất một file `mfe.iife.js` (hoặc `umd`), nhúng toàn bộ CSS và SVG vào trong JS.
- Shadow DOM Wrapper: Viết class extends `HTMLElement`, đính kèm React root vào `.shadowRoot` thay vì `document.body`. Tạo một UI Skeleton (chỉ hiển thị chữ "AirDevice Standby").

## Phase 5: Mobile PWA Client (Tầng Ngoại vi)

- Khởi tạo React/Vite: Setup `apps/mobile-client`.
- Local HTTPS: Cấu hình Vite với plugin `basic-ssl` hoặc `mkcert` để chạy local ở `https://localhost` hoặc IP LAN. Đây là điều kiện tiên quyết để bypass policy của Mobile Browser khi gọi `getUserMedia` sau này.
- UI Skeleton: Tạo màn hình fake quét QR code và hiển thị trạng thái "Waiting for connection".

## Phase 6: Signaling Gateway (Tầng Backend)

- Khởi tạo NestJS: Setup `apps/signaling-server` (Sử dụng Fastify adapter cho HTTP để tối ưu performance, dù HTTP chỉ dùng làm health check).
- WebSocket Gateway Skeleton: Tạo một Gateway class đón kết nối.
- Redis Adapter: Implement `RedisIoAdapter` (nếu dùng Socket.io) hoặc `ws` adapter có bind với Redis Pub/Sub, trỏ tới container Docker ở Phase 3.

## Phase 7: The Session Handshake (Tích hợp WebSocket Client)

- Mục tiêu: Thiết lập Room và quét QR thành công.
- MFE Desktop: Cài đặt `socket.io-client`, gửi payload `SESSION_INIT` lên server. Nhận `SessionID` và dùng thư viện `qrcode` để vẽ mã QR lên màn hình.
- Signaling Server: Dùng Redis để lưu in-memory state (`SessionID` -> MFE Socket ID). Định tuyến tin nhắn vào đúng Room.
- Mobile PWA: Đọc `SessionID` từ URL Query, mở WebSocket lên server gửi `JOIN_SESSION`.
- Output: Khi Mobile quét QR và mở web, màn hình MFE Desktop tự động chuyển từ "Standby" sang "Device Connected".

## Phase 8: WebRTC Core (Tầng Giao thức P2P)

- Mục tiêu: Viết logic thương lượng kết nối (Negotiation) chuẩn mực nhất.
- `packages/webrtc-core`: Chúng ta sẽ không viết code WebRTC lặp lại ở 2 app. Ta sẽ viết một class `AirDevicePeer` dùng chung trong gói này.
- Perfect Negotiation Pattern: Implement pattern chống "SDP Glare" (xung đột khi cả 2 bên cùng gửi Offer một lúc), chia rõ vai trò Polite Peer (Mobile) và Impolite Peer (Desktop).
- Trickle ICE: Gửi ICE Candidate ngay khi gom được thay vì chờ gom đủ (giảm thời gian kết nối từ 3s xuống dưới 500ms).

## Phase 9: Mobile Media Capture (Tầng Ngoại vi)

- Mục tiêu: Chiếm quyền Camera và truyền byte.
- Mobile PWA: Gọi `navigator.mediaDevices.getUserMedia()`. Xử lý các constraint hóc búa của mobile (chỉ lấy camera sau `facingMode: "environment"`, xử lý độ phân giải `ideal: 1080`).
- WebRTC Track: Gắn trực tiếp `MediaStreamTrack` vào `RTCPeerConnection` vừa tạo ở Phase 8 để luồng dữ liệu bắt đầu chảy thẳng về Desktop, bypass qua NestJS.

## Phase 10: MFE Media Render & Host API (Tầng Tích hợp)

- Mục tiêu: Hiển thị Video trên Desktop và giao tiếp với Host App.
- MFE Desktop: Nhận sự kiện `ontrack` từ WebRTC, gán vào thẻ `<video autoplay playsinline>` bên trong Shadow DOM.
- Event Emitter API: MFE sẽ bắn ra các `CustomEvent` (ví dụ: `air-device-frame-captured`) chứa dữ liệu ảnh Base64/Blob ra ngoài Window.
- Host App: Ứng dụng ngân hàng (eKYC) của khách hàng chỉ cần bắt sự kiện đó để lấy ảnh chụp CMND mà không cần biết WebRTC là gì.

## Phase 11: UI/UX Refinement & Cross-Device Sync (Tối ưu Trải nghiệm)

- Mục tiêu: Biến Web Component thành một module linh hoạt (Generic), không bị gò bó vào eKYC, và đồng bộ thao tác giữa 2 thiết bị.
- MFE Desktop (Generic UI): Xóa bỏ các text cứng liên quan đến "Ngân hàng/eKYC". Thay bằng giao diện "AirDevice - Remote Camera Pairing".
- Tối ưu CSS hiển thị Video: Đổi object-fit: cover thành contain (hoặc tính toán tỷ lệ động) để không bị mất góc camera.
- Thiết kế lại khu vực QR Code: Thêm hướng dẫn step-by-step rõ ràng (1. Mở camera điện thoại -> 2. Quét mã -> 3. Giữ kết nối).
- Mobile PWA (Interactive Controls): Thêm nút "📸 Chụp Ảnh" to và rõ ràng trên UI của điện thoại.
- Kiến trúc đồng bộ: Khi user bấm nút chụp trên Mobile, Mobile không tự chụp (vì nặng máy), mà sẽ bắn một event CAPTURE_COMMAND qua WebSocket (hoặc WebRTC DataChannel) lên Desktop, để Desktop tự lấy frame từ <video> lưu lại.
- Device Orientation: Lắng nghe sự kiện xoay màn hình (Landscape/Portrait) trên mobile để xoay layout các nút bấm và báo cho Desktop biết để xoay luồng video tương ứng.

## Phase 12: Quality Assurance (Đảm bảo Chất lượng Code)

- Mục tiêu: Chứng minh cho nhà tuyển dụng thấy bạn có tư duy "Test-Driven" và kiểm soát rủi ro.
- Unit Test (Backend): Sử dụng Jest tích hợp sẵn của NestJS để viết test cho logic Room/Session của signaling.gateway.ts. Đảm bảo user A không bao giờ nhận nhầm luồng video của user B.
- Unit Test (Frontend): Dùng Vitest và React Testing Library để test các component thuần (ví dụ: test UI render đúng QR code khi có session, test nút bấm gọi đúng hàm).
- (Bổ sung) Linter & Formatter: Cấu hình ESLint và Prettier chạy trên toàn bộ Monorepo để đảm bảo code style đồng nhất (rất quan trọng cho Open Source).

## Phase 13: Containerization & DevOps (Đóng gói Triển khai)

- Mục tiêu: Bất kỳ ai clone project về cũng có thể chạy lên bằng 1 câu lệnh duy nhất.
- Docker Multi-stage Builds: Viết Dockerfile tối ưu dung lượng cho từng service:
  - signaling-server: Build Node.js image gọn nhẹ (Alpine).
  - mfe-client & mobile-client: Build ra static files và dùng Nginx alpine để serve.
- Docker Compose: Cập nhật file docker-compose.yml hiện tại (đang có Redis) để chạy đồng loạt cả 4 container: Redis, Signaling, MFE, Mobile. Setup Network và Environment Variables chuẩn xác.

## Phase 14: The Open Source Standard (Tài liệu & Usecase)

- Mục tiêu: Làm cho repo GitHub của bạn trông "đắt tiền" và chuyên nghiệp nhất.
- Global README.md:
  - Gắn Badges (Build status, License, Version).
  - Sơ đồ Kiến trúc (Architecture Diagram - Lấy từ các sơ đồ Mermaid chúng ta đã vẽ).
  - Hướng dẫn Quick Start (chạy bằng Docker).
- Usecases (Ứng dụng thực tế): Liệt kê rõ project này có thể nhúng vào đâu:
  - eKYC Document Scanner: Dùng mobile chụp giấy tờ cho hệ thống web ngân hàng.
  - Remote Webcam: Biến điện thoại thành webcam không dây cho PC (như Apple Continuity Camera).
  - IoT Surveillance: Gắn điện thoại cũ ở nhà làm camera an ninh, xem trực tiếp trên trình duyệt công ty.
- Service Docs: Viết file README.md ngắn gọn trong từng thư mục apps/ giải thích vai trò và cách chạy Dev mode của service đó.

## Phase 15: The Future Roadmap (Tầm nhìn Mở rộng)

- Mục tiêu: Đặt ra định hướng tương lai, thể hiện bạn hiểu sâu về tiềm năng của WebRTC.
- Tính năng bổ sung (Ghi vào Roadmap hoặc làm sau cùng):
  - WebRTC DataChannels: Mở kênh truyền text siêu tốc P2P (bỏ qua NestJS) để truyền lệnh "Bật Flash", "Đổi Camera Trước/Sau" từ Desktop xuống Mobile độ trễ 0ms.
  - Two-way Audio (Walkie-Talkie): Xin quyền audio: true, truyền luồng âm thanh hai chiều giữa Mobile và Desktop.
  - Remote Video Recording: Sử dụng API MediaRecorder trên MFE Desktop để quay lại luồng WebRTC thành file .webm hoặc .mp4 và tải xuống.
