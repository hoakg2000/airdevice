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

export const DeviceCommandPayloadSchema = z.object({
  action: z.enum(['CAPTURE', 'TOGGLE_FLASH', 'ROTATE_CAMERA']),
});

export const JoinSessionPayloadSchema = z.object({
  sessionId: z.string(),
  deviceType: z.literal('mobile'),
});
// 1. Schema cho WebRTC SDP Offer/Answer
export const SdpPayloadSchema = z.object({
  sdp: z.string(),
  type: z.enum(['offer', 'answer', 'pranswer', 'rollback']),
});

// 2. Schema cho WebRTC ICE Candidate
export const IcePayloadSchema = z.object({
  candidate: z.string(),
  sdpMid: z.string().nullish(),       // Đổi nullable() thành nullish()
  sdpMLineIndex: z.number().nullish(),// Đổi nullable() thành nullish()
}).passthrough();

// 3. WSS Router Contract (Bọc lại thành 1 Union duy nhất)
// Pattern này giúp làm Router trên backend cực kỳ type-safe
export const WsMessageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('SESSION_INIT'), payload: SessionInitPayloadSchema }),
  z.object({ type: z.literal('JOIN_SESSION'), payload: JoinSessionPayloadSchema }),
  z.object({ type: z.literal('PING'), payload: PingPayloadSchema }),
  // Thêm 2 loại message mới để trao đổi WebRTC
  z.object({ type: z.literal('WEBRTC_SDP'), payload: SdpPayloadSchema }),
  z.object({ type: z.literal('WEBRTC_ICE'), payload: IcePayloadSchema }),
  z.object({ type: z.literal('DEVICE_COMMAND'), payload: DeviceCommandPayloadSchema }),
]);


// --- TYPES EXPORT ---
export type WsMessage = z.infer<typeof WsMessageSchema>;

export type ServerEvents = {
  session_created: (data: { sessionId: string }) => void;
  peer_connected: (data: { message: string }) => void;
  exception: (data: { status: string; message: string }) => void;
  // Nhận tín hiệu WebRTC từ thiết bị đối diện
  webrtc_sdp_received: (data: z.infer<typeof SdpPayloadSchema>) => void;
  webrtc_ice_received: (data: z.infer<typeof IcePayloadSchema>) => void;
  device_command_received: (data: z.infer<typeof DeviceCommandPayloadSchema>) => void;
};
export type ClientEvents = {
  message: (data: WsMessage) => void;
};

export type SessionInitPayload = z.infer<typeof SessionInitPayloadSchema>;
export type PingPayload = z.infer<typeof PingPayloadSchema>;
