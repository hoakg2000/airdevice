import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { App } from './App';
// Raw CSS string, injected into the Shadow DOM so host styles never leak in or out
import styles from './index.css?inline';

export interface AirDeviceCaptureDetail {
  photo: Blob;
  // 'device': full-resolution photo from the phone; 'stream': frame grabbed from the video
  source: 'device' | 'stream';
}

export interface AirDeviceErrorDetail {
  code: string;
  message: string;
}

export interface AirDeviceEventMap {
  capture: CustomEvent<AirDeviceCaptureDetail>;
  paired: CustomEvent<void>;
  disconnected: CustomEvent<void>;
  error: CustomEvent<AirDeviceErrorDetail>;
}

export class AirDeviceElement extends HTMLElement {
  static observedAttributes = ['server-url', 'mobile-url', 'lang'];
  private mount?: HTMLDivElement;
  private root?: Root;

  connectedCallback() {
    if (!this.shadowRoot) {
      const shadow = this.attachShadow({ mode: 'open' });
      const style = document.createElement('style');
      style.textContent = styles;
      this.mount = document.createElement('div');
      shadow.append(style, this.mount);
    }
    this.root = createRoot(this.mount!);
    this.render();
  }

  // Unmounting closes the socket and the peer connection
  disconnectedCallback() {
    this.root?.unmount();
    this.root = undefined;
  }

  attributeChangedCallback() {
    this.render();
  }

  private render() {
    this.root?.render(
      createElement(App, {
        serverUrl: this.getAttribute('server-url') || location.origin,
        mobileUrl: this.getAttribute('mobile-url') || undefined,
        lang: this.lang || document.documentElement.lang || navigator.language,
        emit: (name: string, detail?: unknown) =>
          this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true })),
      }),
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'air-device': AirDeviceElement;
  }
}

if (!customElements.get('air-device')) customElements.define('air-device', AirDeviceElement);
