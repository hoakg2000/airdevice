import type { RedisClientType } from 'redis';

export interface SessionRecord {
  desktopId: string;
  token: string;
  mobileId?: string;
}

export abstract class SessionStore {
  abstract get(sessionId: string): Promise<SessionRecord | null>;
  abstract set(sessionId: string, record: SessionRecord, ttlSec: number): Promise<void>;
  abstract delete(sessionId: string): Promise<void>;
}

export class MemorySessionStore extends SessionStore {
  private sessions = new Map<string, { record: SessionRecord; expiresAt: number }>();

  async get(sessionId: string) {
    const entry = this.sessions.get(sessionId);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) {
      this.sessions.delete(sessionId);
      return null;
    }
    return entry.record;
  }

  async set(sessionId: string, record: SessionRecord, ttlSec: number) {
    this.sessions.set(sessionId, { record, expiresAt: Date.now() + ttlSec * 1000 });
  }

  async delete(sessionId: string) {
    this.sessions.delete(sessionId);
  }
}

export class RedisSessionStore extends SessionStore {
  constructor(private client: RedisClientType) {
    super();
  }

  async get(sessionId: string) {
    const raw = await this.client.get(`air-device:session:${sessionId}`);
    return raw ? (JSON.parse(raw) as SessionRecord) : null;
  }

  async set(sessionId: string, record: SessionRecord, ttlSec: number) {
    await this.client.set(`air-device:session:${sessionId}`, JSON.stringify(record), {
      EX: ttlSec,
    });
  }

  async delete(sessionId: string) {
    await this.client.del(`air-device:session:${sessionId}`);
  }
}
