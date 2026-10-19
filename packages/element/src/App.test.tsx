import { act, fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import type { HostSession } from '@air-device/client';
import { App } from './App';

// Capture the HostSession the component creates so tests can drive its callbacks
const sessions: HostSession[] = [];
vi.mock('@air-device/client', () => ({
  HostSession: vi.fn().mockImplementation(() => {
    const session = {
      start: vi.fn(),
      destroy: vi.fn(),
      capture: vi.fn(() => true),
      regenerate: vi.fn(),
    };
    sessions.push(session as unknown as HostSession);
    return session;
  }),
}));

const renderApp = (lang = 'en') => {
  const emit = vi.fn();
  render(<App serverUrl="http://localhost:3000" lang={lang} emit={emit} />);
  return { emit, session: sessions.at(-1)! };
};

describe('<air-device> App', () => {
  it('shows the connecting state first', () => {
    renderApp();
    expect(screen.getByRole('status')).toHaveTextContent('Connecting to server');
  });

  it('uses Vietnamese when lang is vi', () => {
    renderApp('vi-VN');
    expect(screen.getByRole('status')).toHaveTextContent('Đang kết nối');
  });

  it('shows the QR code and countdown while waiting', () => {
    const { session } = renderApp();
    act(() => {
      session.onPairing?.({
        url: 'https://x/m/#s=1&t=2',
        sessionId: '1',
        expiresAt: Date.now() + 90_000,
      });
      session.onState?.('waiting');
    });
    expect(screen.getByLabelText('Connect your phone camera')).toBeInTheDocument();
    expect(screen.getByText(/Code expires in 1:3\d/)).toBeInTheDocument();
  });

  it('offers a new QR code once expired', () => {
    const { session } = renderApp();
    act(() => {
      session.onPairing?.({ url: 'u', sessionId: '1', expiresAt: Date.now() - 1 });
      session.onState?.('waiting');
    });
    fireEvent.click(screen.getByText('New QR code'));
    expect(session.regenerate).toHaveBeenCalled();
  });

  it('emits paired, capture and disconnected events', () => {
    const { session, emit } = renderApp();
    act(() => session.onState?.('paired'));
    expect(emit).toHaveBeenCalledWith('paired');

    const photo = new Blob(['x'], { type: 'image/jpeg' });
    act(() => session.onPhoto?.(photo));
    expect(emit).toHaveBeenCalledWith('capture', { photo, source: 'device' });

    act(() => {
      session.onPairing?.({ url: 'u', sessionId: '1', expiresAt: Date.now() + 60_000 });
      session.onState?.('waiting');
    });
    expect(emit).toHaveBeenCalledWith('disconnected');
    expect(screen.getByText(/Phone disconnected/)).toBeInTheDocument();
  });

  it('shows retry on connection error and restarts the session', () => {
    const { session } = renderApp();
    act(() => session.onState?.('error'));
    fireEvent.click(screen.getByText('Retry'));
    expect(session.destroy).toHaveBeenCalled();
    expect(sessions.at(-1)).not.toBe(session);
  });
});
