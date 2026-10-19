import { ChannelMessageSchema, type ChannelMessage } from '@air-device/protocol';

const CHUNK_BYTES = 16 * 1024;
const HIGH_WATER_BYTES = CHUNK_BYTES * 64;

export function sendMessage(channel: RTCDataChannel, message: ChannelMessage) {
  channel.send(JSON.stringify(message));
}

// Sends a PHOTO header then the bytes in chunks, respecting the channel's send buffer
export async function sendBlob(channel: RTCDataChannel, blob: Blob) {
  const bytes = await blob.arrayBuffer();
  sendMessage(channel, { type: 'PHOTO', size: bytes.byteLength, mime: blob.type || 'image/jpeg' });
  channel.bufferedAmountLowThreshold = CHUNK_BYTES * 8;
  for (let offset = 0; offset < bytes.byteLength; offset += CHUNK_BYTES) {
    if (channel.bufferedAmount > HIGH_WATER_BYTES) {
      await new Promise((resolve) =>
        channel.addEventListener('bufferedamountlow', resolve, { once: true }),
      );
    }
    channel.send(bytes.slice(offset, offset + CHUNK_BYTES));
  }
}

// Returns an onmessage handler that reassembles photos and forwards other messages
export function createChannelReceiver(handlers: {
  onPhoto?: (blob: Blob) => void;
  onMessage?: (message: ChannelMessage) => void;
}) {
  let pending: { size: number; mime: string; parts: ArrayBuffer[]; received: number } | null = null;

  return (event: MessageEvent) => {
    if (typeof event.data === 'string') {
      let raw: unknown;
      try {
        raw = JSON.parse(event.data);
      } catch {
        return;
      }
      const parsed = ChannelMessageSchema.safeParse(raw);
      if (!parsed.success) return;
      if (parsed.data.type === 'PHOTO') {
        pending = { size: parsed.data.size, mime: parsed.data.mime, parts: [], received: 0 };
      } else {
        handlers.onMessage?.(parsed.data);
      }
      return;
    }

    if (!pending || !(event.data instanceof ArrayBuffer)) return;
    pending.parts.push(event.data);
    pending.received += event.data.byteLength;
    if (pending.received > pending.size) {
      pending = null; // sender lied about size; drop it
      return;
    }
    if (pending.received === pending.size) {
      handlers.onPhoto?.(new Blob(pending.parts, { type: pending.mime }));
      pending = null;
    }
  };
}
