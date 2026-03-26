# Kế hoạch Setup Skeleton "Air-Device"

## Phase 1: Workspace Foundation & Core Configs (Tầng Nền tảng)
* Root Configuration: Hoàn thiện `pnpm-workspace.yaml` và `package.json` gốc. Thiết lập engine strict (Node >= 20, pnpm >= 8).
* Shared TS/ESLint Config (`packages/config`): Tạo `tsconfig.base.json` với `compilerOptions` tối ưu cho Monorepo (sử dụng `composite: true` hoặc `path mapping`) để chia sẻ type mượt mà mà không cần build step phức tạp.

## Phase 2: Shared Contracts (Tầng Giao thức)
* Khởi tạo `packages/shared-types`: Setup `package.json` cho module này.
* Skeleton Types: Định nghĩa một vài Zod schema cơ bản (VD: `SessionInit`, `Ping`) và export chúng. Mục đích là để test việc Import xuyên module (từ Frontend và Backend trỏ về gói shared này) xem pnpm symlink đã hoạt động đúng chưa.

## Phase 3: Infrastructure (Tầng Hạ tầng cục bộ)
* Docker Compose (`docker/docker-compose.yml`): Viết script dựng Redis container (alpine, minimal footprint) để làm Pub/Sub backend cho NestJS.

## Phase 4: MFE Web Component (Tầng Client Desktop)
* Khởi tạo React/Vite: Setup `apps/mfe-client`.
* Vite Single-Bundle Config: Ghi đè cấu hình Rollup bên trong Vite để vô hiệu hóa code-splitting. Ép xuất ra duy nhất một file `mfe.iife.js` (hoặc `umd`), nhúng toàn bộ CSS và SVG vào trong JS.
* Shadow DOM Wrapper: Viết class extends `HTMLElement`, đính kèm React root vào `.shadowRoot` thay vì `document.body`. Tạo một UI Skeleton (chỉ hiển thị chữ "AirDevice Standby").

## Phase 5: Mobile PWA Client (Tầng Ngoại vi)
* Khởi tạo React/Vite: Setup `apps/mobile-client`.
* Local HTTPS: Cấu hình Vite với plugin `basic-ssl` hoặc `mkcert` để chạy local ở `https://localhost` hoặc IP LAN. Đây là điều kiện tiên quyết để bypass policy của Mobile Browser khi gọi `getUserMedia` sau này.
* UI Skeleton: Tạo màn hình fake quét QR code và hiển thị trạng thái "Waiting for connection".

## Phase 6: Signaling Gateway (Tầng Backend)
* Khởi tạo NestJS: Setup `apps/signaling-server` (Sử dụng Fastify adapter cho HTTP để tối ưu performance, dù HTTP chỉ dùng làm health check).
* WebSocket Gateway Skeleton: Tạo một Gateway class đón kết nối.
* Redis Adapter: Implement `RedisIoAdapter` (nếu dùng Socket.io) hoặc `ws` adapter có bind với Redis Pub/Sub, trỏ tới container Docker ở Phase 3.

## Phase 7: The Session Handshake (Tích hợp WebSocket Client)
* Mục tiêu: Thiết lập Room và quét QR thành công.
* MFE Desktop: Cài đặt `socket.io-client`, gửi payload `SESSION_INIT` lên server. Nhận `SessionID` và dùng thư viện `qrcode` để vẽ mã QR lên màn hình.
* Signaling Server: Dùng Redis để lưu in-memory state (`SessionID` -> MFE Socket ID). Định tuyến tin nhắn vào đúng Room.
* Mobile PWA: Đọc `SessionID` từ URL Query, mở WebSocket lên server gửi `JOIN_SESSION`.
* Output: Khi Mobile quét QR và mở web, màn hình MFE Desktop tự động chuyển từ "Standby" sang "Device Connected".

## Phase 8: WebRTC Core (Tầng Giao thức P2P)
* Mục tiêu: Viết logic thương lượng kết nối (Negotiation) chuẩn mực nhất.
* `packages/webrtc-core`: Chúng ta sẽ không viết code WebRTC lặp lại ở 2 app. Ta sẽ viết một class `AirDevicePeer` dùng chung trong gói này.
* Perfect Negotiation Pattern: Implement pattern chống "SDP Glare" (xung đột khi cả 2 bên cùng gửi Offer một lúc), chia rõ vai trò Polite Peer (Mobile) và Impolite Peer (Desktop).
* Trickle ICE: Gửi ICE Candidate ngay khi gom được thay vì chờ gom đủ (giảm thời gian kết nối từ 3s xuống dưới 500ms).

## Phase 9: Mobile Media Capture (Tầng Ngoại vi)
* Mục tiêu: Chiếm quyền Camera và truyền byte.
* Mobile PWA: Gọi `navigator.mediaDevices.getUserMedia()`. Xử lý các constraint hóc búa của mobile (chỉ lấy camera sau `facingMode: "environment"`, xử lý độ phân giải `ideal: 1080`).
* WebRTC Track: Gắn trực tiếp `MediaStreamTrack` vào `RTCPeerConnection` vừa tạo ở Phase 8 để luồng dữ liệu bắt đầu chảy thẳng về Desktop, bypass qua NestJS.

## Phase 10: MFE Media Render & Host API (Tầng Tích hợp)
* Mục tiêu: Hiển thị Video trên Desktop và giao tiếp với Host App.
* MFE Desktop: Nhận sự kiện `ontrack` từ WebRTC, gán vào thẻ `<video autoplay playsinline>` bên trong Shadow DOM.
* Event Emitter API: MFE sẽ bắn ra các `CustomEvent` (ví dụ: `air-device-frame-captured`) chứa dữ liệu ảnh Base64/Blob ra ngoài Window.
* Host App: Ứng dụng ngân hàng (eKYC) của khách hàng chỉ cần bắt sự kiện đó để lấy ảnh chụp CMND mà không cần biết WebRTC là gì.