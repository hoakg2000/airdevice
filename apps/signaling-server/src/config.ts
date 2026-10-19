import { IceServersSchema, type IceServer } from '@air-device/protocol';

const DEFAULT_ICE_SERVERS: IceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }];

function parseIceServers(raw: string | undefined): IceServer[] {
  if (!raw) return DEFAULT_ICE_SERVERS;
  const parsed = IceServersSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) throw new Error(`Invalid ICE_SERVERS: ${parsed.error.message}`);
  return parsed.data;
}

export const config = {
  port: Number(process.env.PORT ?? 3000),
  host: process.env.HOST ?? '0.0.0.0',
  // Comma-separated list of allowed origins for the desktop page; '*' allows any
  corsOrigins: (process.env.CORS_ORIGINS ?? '*').split(',').map((o) => o.trim()),
  // Optional: enables the socket.io Redis adapter and Redis session store (multi-instance)
  redisUrl: process.env.REDIS_URL,
  iceServers: parseIceServers(process.env.ICE_SERVERS),
  // How long a QR code stays valid before pairing
  sessionTtlSec: Number(process.env.SESSION_TTL_SEC ?? 300),
  // Built mobile app to serve at /m/ (set in the Docker image)
  mobileDir: process.env.MOBILE_DIR,
};
