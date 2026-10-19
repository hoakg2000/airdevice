import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { App } from './App';

vi.mock('@air-device/client', async (importOriginal) => ({
  // keep the real hash parser, fake the network session
  parsePairingHash: (await importOriginal<typeof import('@air-device/client')>()).parsePairingHash,
  CameraSession: vi.fn().mockImplementation(() => ({ start: vi.fn(), destroy: vi.fn() })),
}));

const setHash = (hash: string) => {
  window.history.replaceState(null, '', `/${hash}`);
};

describe('Mobile camera page', () => {
  it('shows an error when the link has no pairing info', () => {
    setHash('');
    render(<App />);
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid link');
  });

  it('explains how to fix a blocked camera permission', async () => {
    setHash('#s=abc&t=token');
    const denied = Object.assign(new Error('no'), { name: 'NotAllowedError' });
    vi.spyOn(navigator.mediaDevices, 'getUserMedia').mockRejectedValue(denied);
    render(<App />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Camera access was blocked');
  });
});
