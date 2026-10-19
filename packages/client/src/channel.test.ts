import { describe, expect, it, vi } from 'vitest';
import { createChannelReceiver, sendBlob } from './channel';

// Loopback "channel" that delivers everything sent to a receiver
function loopback(onmessage: (event: MessageEvent) => void) {
  return {
    bufferedAmount: 0,
    bufferedAmountLowThreshold: 0,
    addEventListener: vi.fn(),
    send: (data: string | ArrayBuffer) => onmessage({ data } as MessageEvent),
  } as unknown as RTCDataChannel;
}

describe('photo transfer over DataChannel', () => {
  it('reassembles a multi-chunk photo', async () => {
    const onPhoto = vi.fn();
    const channel = loopback(createChannelReceiver({ onPhoto }));
    const bytes = new Uint8Array(40_000).map((_, i) => i % 251);
    await sendBlob(channel, new Blob([bytes], { type: 'image/jpeg' }));

    expect(onPhoto).toHaveBeenCalledTimes(1);
    const photo: Blob = onPhoto.mock.calls[0][0];
    expect(photo.type).toBe('image/jpeg');
    expect(new Uint8Array(await photo.arrayBuffer())).toEqual(bytes);
  });

  it('forwards commands and ignores junk', () => {
    const onMessage = vi.fn();
    const receive = createChannelReceiver({ onMessage });
    receive({ data: 'not json' } as MessageEvent);
    receive({ data: JSON.stringify({ type: 'HACK' }) } as MessageEvent);
    receive({ data: new ArrayBuffer(8) } as MessageEvent); // binary without header
    receive({ data: JSON.stringify({ type: 'CAPTURE' }) } as MessageEvent);
    expect(onMessage).toHaveBeenCalledTimes(1);
    expect(onMessage).toHaveBeenCalledWith({ type: 'CAPTURE' });
  });

  it('rejects oversized photo headers', () => {
    const onPhoto = vi.fn();
    const receive = createChannelReceiver({ onPhoto });
    receive({
      data: JSON.stringify({ type: 'PHOTO', size: 1e9, mime: 'image/jpeg' }),
    } as MessageEvent);
    receive({ data: new ArrayBuffer(8) } as MessageEvent);
    expect(onPhoto).not.toHaveBeenCalled();
  });
});
