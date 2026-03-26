import { z } from 'zod';

// 1. Payload: Xin cấp Session mới (Từ Desktop MFE)
export const SessionInitPayloadSchema = z.object({
  deviceType: z.literal('desktop'),
  userAgent: z.string().optional(),
});

// 2. Payload: Ping/Pong Keep-Alive (Dùng chung)
export const PingPayloadSchema = z.object({
  timestamp: z.number(),
});

export const JoinSessionPayloadSchema = z.object({
  sessionId: z.string(),
  deviceType: z.literal('mobile'),
});

// 3. WSS Router Contract (Bọc lại thành 1 Union duy nhất)
// Pattern này giúp làm Router trên backend cực kỳ type-safe
export const WsMessageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('SESSION_INIT'), payload: SessionInitPayloadSchema }),
  z.object({ type: z.literal('JOIN_SESSION'), payload: JoinSessionPayloadSchema }),
  z.object({ type: z.literal('PING'), payload: PingPayloadSchema }),
]);


// --- TYPES EXPORT ---
export type WsMessage = z.infer<typeof WsMessageSchema>;

export type ServerEvents = {
  session_created: (data: { sessionId: string }) => void;
  peer_connected: (data: { message: string }) => void;
  exception: (data: { status: string; message: string }) => void;
};

export type ClientEvents = {
  message: (data: WsMessage) => void;
};

export type SessionInitPayload = z.infer<typeof SessionInitPayloadSchema>;
export type PingPayload = z.infer<typeof PingPayloadSchema>;

