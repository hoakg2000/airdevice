import { z } from 'zod';

// --- Socket messages: client -> server (all sent on the 'message' event) ---

export const SessionInitPayloadSchema = z.object({
  deviceType: z.literal('desktop'),
  userAgent: z.string().max(512).optional(),
});

export const JoinSessionPayloadSchema = z.object({
  sessionId: z.string().uuid(),
  token: z.string().min(16).max(128),
  deviceType: z.literal('mobile'),
});

export const SdpPayloadSchema = z.object({
  sdp: z.string().max(100_000),
  type: z.enum(['offer', 'answer', 'pranswer', 'rollback']),
});

export const IcePayloadSchema = z.object({
  candidate: z.string().max(2_000),
  sdpMid: z.string().max(64).nullish(),
  sdpMLineIndex: z.number().int().nullish(),
  usernameFragment: z.string().max(256).nullish(),
});

// Discriminated union so the server can route type-safely
export const WsMessageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('SESSION_INIT'), payload: SessionInitPayloadSchema }),
  z.object({ type: z.literal('JOIN_SESSION'), payload: JoinSessionPayloadSchema }),
  z.object({ type: z.literal('WEBRTC_SDP'), payload: SdpPayloadSchema }),
  z.object({ type: z.literal('WEBRTC_ICE'), payload: IcePayloadSchema }),
]);

// --- ICE server config (also used to validate the server's ICE_SERVERS env) ---

export const IceServerSchema = z.object({
  urls: z.union([z.string(), z.array(z.string())]),
  username: z.string().optional(),
  credential: z.string().optional(),
});
export const IceServersSchema = z.array(IceServerSchema);

// --- Peer-to-peer DataChannel messages (JSON text frames; photo bytes follow as binary) ---

export const MAX_PHOTO_BYTES = 20 * 1024 * 1024;

export const ChannelMessageSchema = z.discriminatedUnion('type', [
  // desktop -> mobile: take a full-resolution photo
  z.object({ type: z.literal('CAPTURE') }),
  // mobile -> desktop: header for the binary chunks that follow
  z.object({
    type: z.literal('PHOTO'),
    size: z.number().int().positive().max(MAX_PHOTO_BYTES),
    mime: z.string().max(64),
  }),
]);

export const ErrorCodes = [
  'INVALID_PAYLOAD',
  'SESSION_NOT_FOUND',
  'INVALID_TOKEN',
  'SESSION_FULL',
  'NOT_IN_SESSION',
] as const;

// --- TYPES EXPORT ---
export type WsMessage = z.infer<typeof WsMessageSchema>;
export type SdpPayload = z.infer<typeof SdpPayloadSchema>;
export type IcePayload = z.infer<typeof IcePayloadSchema>;
export type IceServer = z.infer<typeof IceServerSchema>;
export type ChannelMessage = z.infer<typeof ChannelMessageSchema>;
export type ErrorCode = (typeof ErrorCodes)[number];
export type SessionInitPayload = z.infer<typeof SessionInitPayloadSchema>;
export type JoinSessionPayload = z.infer<typeof JoinSessionPayloadSchema>;

export type ServerEvents = {
  session_created: (data: {
    sessionId: string;
    token: string;
    expiresAt: number;
    iceServers: IceServer[];
  }) => void;
  session_joined: (data: { sessionId: string; iceServers: IceServer[] }) => void;
  peer_connected: (data: { role: 'mobile' }) => void;
  peer_disconnected: (data: { role: 'desktop' | 'mobile' }) => void;
  exception: (data: { code: ErrorCode; message: string }) => void;
  webrtc_sdp_received: (data: SdpPayload) => void;
  webrtc_ice_received: (data: IcePayload) => void;
};

export type ClientEvents = {
  message: (data: WsMessage) => void;
};
