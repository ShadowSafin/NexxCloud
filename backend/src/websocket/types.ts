import { WebSocket } from "ws";

export type WSMessageType =
  | "file_update"
  | "upload_progress"
  | "notification"
  | "activity"
  | "presence"
  | "sync_event"
  | "ping"
  | "pong"
  | "error";

export interface WSMessage<T = unknown> {
  type: WSMessageType;
  payload: T;
  timestamp: string;
  userId?: string;
}

export interface WSConnectionMeta {
  userId: string;
  username: string;
  email: string;
  connectedAt: Date;
  lastActivity: Date;
}

export interface WSClient extends WebSocket {
  userId?: string;
  username?: string;
  email?: string;
  isAlive?: boolean;
  lastActivity?: Date;
}
