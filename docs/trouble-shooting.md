# Hướng dẫn Xử lý Sự cố (Troubleshooting Guide)

Tài liệu này cung cấp các bước xử lý sự cố cho các vấn đề thường gặp trong quá trình thiết lập và phát triển dự án "Air-Device".

## 1. Vấn đề về Monorepo và Cấu hình Chung

### 1.1. Lỗi `pnpm` hoặc `Node.js` phiên bản không tương thích

**Triệu chứng:**
- Lỗi khi chạy `pnpm install` hoặc các lệnh `pnpm` khác.
- Thông báo lỗi liên quan đến phiên bản Node.js hoặc pnpm.

**Khắc phục:**
1.  **Kiểm tra phiên bản Node.js:** Đảm bảo bạn đang sử dụng Node.js phiên bản 20 trở lên.
    ```bash
    node -v
    ```
    Nếu không đúng, hãy sử dụng `nvm` (Node Version Manager) để cài đặt và chuyển đổi phiên bản:
    ```bash
    nvm install 20
    nvm use 20
    ```
2.  **Kiểm tra phiên bản pnpm:** Đảm bảo bạn đang sử dụng pnpm phiên bản 8 trở lên.
    ```bash
    pnpm -v
    ```
    Nếu không đúng, cập nhật pnpm:
    ```bash
    npm install -g pnpm@latest
    ```
3.  **Kiểm tra `package.json` gốc:** Đảm bảo phần `engines` trong `package.json` gốc đã được cấu hình đúng:
    ```json
    // d:/project/airdevice/package.json
    "engines": {
      "node": ">=20.0.0",
      "pnpm": ">=8.0.0"
    },
    ```

### 1.2. Lỗi import type giữa các package

**Triệu chứng:**
- TypeScript báo lỗi `Cannot find module '...'` hoặc `Property '...' does not exist on type '...'` khi import từ `packages/shared-types`.
- IDE không nhận diện được type từ các package khác.

**Khắc phục:**
1.  **Chạy `pnpm install` lại:** Đảm bảo các symlink của pnpm đã được tạo đúng cách.
    ```bash
    pnpm install
    ```
2.  **Kiểm tra `tsconfig.base.json`:** Đảm bảo `tsconfig.base.json` trong `packages/config` được cấu hình đúng cho monorepo, đặc biệt là `compilerOptions.composite` và `compilerOptions.paths`.
3.  **Kiểm tra `tsconfig.json` của từng app/package:** Đảm bảo chúng `extends` từ `tsconfig.base.json` và có các `references` đến các package phụ thuộc.
4.  **Khởi động lại IDE:** Đôi khi IDE (VS Code) cần khởi động lại để nhận diện các thay đổi về cấu hình TypeScript.

## 2. Vấn đề về Hạ tầng (Docker & Redis)

### 2.1. Redis container không khởi động hoặc không thể kết nối

**Triệu chứng:**
- Lệnh `docker-compose up -d` báo lỗi.
- NestJS backend không thể kết nối tới Redis.
- `docker ps` không hiển thị container `air-device-redis`.

**Khắc phục:**
1.  **Kiểm tra Docker Daemon:** Đảm bảo Docker Desktop (hoặc Docker Engine) đang chạy.
2.  **Kiểm tra logs của Redis:**
    ```bash
    docker logs air-device-redis
    ```
    Tìm kiếm các lỗi cấu hình hoặc lỗi khởi động.
3.  **Kiểm tra file `redis.conf`:** Đảm bảo file `d:/project/airdevice/docker/redis/redis.conf` tồn tại và không có lỗi cú pháp.
4.  **Kiểm tra port:** Đảm bảo port `6379` không bị ứng dụng khác chiếm dụng trên máy host của bạn.
5.  **Kiểm tra Healthcheck:** Nếu NestJS không khởi động được vì Redis chưa sẵn sàng, hãy kiểm tra trạng thái healthcheck của Redis:
    ```bash
    docker inspect --format='{{json .State.Health}}' air-device-redis
    ```
    Nếu trạng thái là `unhealthy`, kiểm tra lại cấu hình `redis.conf` và lệnh `redis-cli ping`.

## 3. Vấn đề về Client (MFE & Mobile PWA)

### 3.1. `getUserMedia` không hoạt động trên Mobile PWA

**Triệu chứng:**
- Mobile PWA không thể truy cập camera.
- Lỗi `NotAllowedError` hoặc `NotReadableError` trong console.

**Khắc phục:**
1.  **Đảm bảo HTTPS:** `getUserMedia` yêu cầu kết nối an toàn (HTTPS).
    -   Kiểm tra URL của Mobile PWA có phải là `https://` không.
    -   Đảm bảo cấu hình Vite với plugin `basic-ssl` hoặc `mkcert` đã hoạt động đúng.
    -   Nếu chạy trên LAN IP, đảm bảo chứng chỉ SSL được tạo cho IP đó và được tin cậy trên thiết bị di động.
2.  **Kiểm tra quyền truy cập camera:**
    -   Trên thiết bị di động, kiểm tra cài đặt quyền của trình duyệt đối với trang web của bạn.
    -   Đảm bảo bạn đã cấp quyền truy cập camera khi được hỏi.
3.  **Kiểm tra `constraints`:** Đảm bảo các `constraints` truyền vào `getUserMedia` là hợp lệ và được thiết bị hỗ trợ. Thử với các `constraints` đơn giản hơn trước.
    ```javascript
    // Ví dụ:
    navigator.mediaDevices.getUserMedia({ video: true, audio: false })
    ```

### 3.2. MFE Web Component không hiển thị hoặc không tương tác

**Triệu chứng:**
- MFE không xuất hiện trên trang host.
- React component bên trong Shadow DOM không render.
- CSS hoặc SVG không hiển thị đúng.

**Khắc phục:**
1.  **Kiểm tra file bundle:** Đảm bảo Vite đã xuất ra một file JS duy nhất (ví dụ: `mfe.iife.js`) và file này được nhúng đúng cách vào trang host.
2.  **Kiểm tra Shadow DOM:**
    -   Sử dụng công cụ DevTools của trình duyệt để kiểm tra xem `shadowRoot` đã được tạo và React root đã được đính kèm vào đó chưa.
    -   Đảm bảo class `HTMLElement` tùy chỉnh của bạn được định nghĩa và đăng ký đúng cách (`customElements.define(...)`).
3.  **Kiểm tra cấu hình Vite/Rollup:** Đảm bảo cấu hình ghi đè Rollup để vô hiệu hóa code-splitting và nhúng CSS/SVG vào JS đã hoạt động.

## 4. Vấn đề về Signaling Gateway (Backend)

### 4.1. NestJS server không khởi động hoặc WebSocket không kết nối

**Triệu chứng:**
- Lỗi khi chạy `pnpm dev` trong `apps/signaling-server`.
- Client không thể kết nối WebSocket tới server.
- Lỗi `WebSocket connection failed` hoặc `ERR_CONNECTION_REFUSED`.

**Khắc phục:**
1.  **Kiểm tra logs của NestJS:** Xem console output của NestJS để tìm lỗi khởi động hoặc lỗi kết nối Redis.
2.  **Kiểm tra port:** Đảm bảo port của NestJS (mặc định 3000 hoặc cấu hình trong `.env`) không bị chiếm dụng.
3.  **Kiểm tra kết nối Redis:** Đảm bảo NestJS có thể kết nối tới Redis container. Kiểm tra chuỗi kết nối Redis trong cấu hình của NestJS.
4.  **Kiểm tra CORS:** Nếu client và server chạy trên các domain/port khác nhau, đảm bảo CORS đã được cấu hình đúng trên NestJS cho WebSocket và HTTP.

## 5. Vấn đề về WebRTC

### 5.1. Kết nối WebRTC không thành công (Video không hiển thị)

**Triệu chứng:**
- Video stream từ Mobile không hiển thị trên MFE Desktop.
- Lỗi `ICE connection failed` hoặc `PeerConnectionState` không chuyển sang `connected`.

**Khắc phục:**
1.  **Kiểm tra Signaling:** Đảm bảo các tin nhắn SDP (Offer/Answer) và ICE Candidates đang được trao đổi thành công qua Signaling Server.
    -   Kiểm tra logs của Signaling Server.
    -   Sử dụng DevTools (Network tab, WebSocket frames) để xem các tin nhắn đi và đến.
2.  **Kiểm tra STUN/TURN Servers:**
    -   Đảm bảo bạn đã cấu hình các STUN server (ví dụ: `stun:stun.l.google.com:19302`) trong `RTCPeerConnection` config.
    -   Nếu các thiết bị nằm sau NAT phức tạp, bạn có thể cần một TURN server.
3.  **Kiểm tra `AirDevicePeer` logic:**
    -   Đảm bảo logic "Perfect Negotiation Pattern" và "Trickle ICE" được triển khai đúng cách trong `packages/webrtc-core`.
    -   Kiểm tra xem các sự kiện `onicecandidate`, `ontrack`, `onnegotiationneeded` có được xử lý đúng không.
4.  **Kiểm tra `MediaStreamTrack`:** Đảm bảo `MediaStreamTrack` từ `getUserMedia` đã được thêm vào `RTCPeerConnection` trên Mobile PWA.
    ```javascript
    peerConnection.addTrack(mediaStreamTrack, mediaStream);
    ```
5.  **Kiểm tra thẻ `<video>`:** Đảm bảo thẻ `<video>` trên MFE Desktop có các thuộc tính `autoplay` và `playsinline` và `srcObject` được gán đúng cách.

---

Nếu bạn gặp phải một vấn đề không có trong danh sách này, hãy ghi lại các bước tái hiện, thông báo lỗi cụ thể và logs liên quan để dễ dàng gỡ lỗi hơn.