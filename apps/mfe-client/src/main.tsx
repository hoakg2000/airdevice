import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
// Import CSS dưới dạng chuỗi thô (raw string) nhờ hậu tố ?inline của Vite
import styles from './index.css?inline';

class AirDeviceElement extends HTMLElement {
  connectedCallback() {
    // Tránh việc render lại nếu Element bị di chuyển trong DOM tree
    if (this.shadowRoot) return;

    // 1. Gắn Shadow DOM ở mode 'open' (để React có thể thao tác events bên trong)
    const shadow = this.attachShadow({ mode: 'open' });
    
    // 2. Bơm CSS cục bộ vào Shadow Root. 
    // Tuyệt đối không ảnh hưởng đến Host Web, và Host Web cũng không chạm được vào đây.
    const styleTag = document.createElement('style');
    styleTag.textContent = styles;
    shadow.appendChild(styleTag);

    // 3. Tạo điểm neo (Mount point) cho React
    const mountPoint = document.createElement('div');
    shadow.appendChild(mountPoint);

    // 4. Render React App
    const root = createRoot(mountPoint);
    root.render(
      // <React.StrictMode>
        <App />
      // </React.StrictMode>
    );
  }
}

// Đăng ký Web Component với Browser
if (!customElements.get('air-device')) {
  customElements.define('air-device', AirDeviceElement);
}