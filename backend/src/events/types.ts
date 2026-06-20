import { v4 as uuidv4 } from "uuid";

export interface CloudEventData {
  eventId: string;
  timestamp: string;
  userId?: string;
  [key: string]: unknown;
}

export interface FileCreatedData extends CloudEventData {
  fileId: string;
  folderId?: string;
  fileName: string;
  mimeType: string;
  size: number;
}

export interface FileUpdatedData extends CloudEventData {
  fileId: string;
  folderId?: string;
  fileName: string;
  changes: Record<string, unknown>;
}

export interface FileDeletedData extends CloudEventData {
  fileId: string;
  folderId?: string;
  fileName: string;
}

export interface FileMovedData extends CloudEventData {
  fileId: string;
  fileName: string;
  fromFolderId?: string;
  toFolderId?: string;
}

export interface FileCopiedData extends CloudEventData {
  fileId: string;
  originalFileId: string;
  folderId?: string;
  fileName: string;
}

export interface FileUploadedData extends CloudEventData {
  fileId: string;
  folderId?: string;
  fileName: string;
  mimeType: string;
  size: number;
  uploadSessionId?: string;
}

export interface FileVersionedData extends CloudEventData {
  fileId: string;
  folderId?: string;
  fileName: string;
  version: number;
  size: number;
}

export interface FolderCreatedData extends CloudEventData {
  folderId: string;
  parentFolderId?: string;
  folderName: string;
}

export interface FolderUpdatedData extends CloudEventData {
  folderId: string;
  parentFolderId?: string;
  folderName: string;
  changes: Record<string, unknown>;
}

export interface FolderDeletedData extends CloudEventData {
  folderId: string;
  parentFolderId?: string;
  folderName: string;
}

export interface FolderMovedData extends CloudEventData {
  folderId: string;
  folderName: string;
  fromParentFolderId?: string;
  toParentFolderId?: string;
}

export interface UserLoginData extends CloudEventData {
  userId: string;
  username: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface UserLogoutData extends CloudEventData {
  userId: string;
  username: string;
}

export interface UploadStartedData extends CloudEventData {
  uploadSessionId: string;
  fileName: string;
  mimeType: string;
  totalSize: number;
  totalChunks: number;
  folderId?: string;
}

export interface UploadProgressData extends CloudEventData {
  uploadSessionId: string;
  fileName: string;
  uploadedChunks: number;
  totalChunks: number;
  progress: number;
}

export interface UploadCompletedData extends CloudEventData {
  uploadSessionId: string;
  fileId: string;
  fileName: string;
  totalSize: number;
}

export interface UploadFailedData extends CloudEventData {
  uploadSessionId: string;
  fileName: string;
  error: string;
}

export interface ShareCreatedData extends CloudEventData {
  shareId: string;
  fileId: string;
  fileName: string;
  token: string;
  expiresAt?: string;
  allowDownload: boolean;
}

export interface ShareRevokedData extends CloudEventData {
  shareId: string;
  fileId: string;
  fileName: string;
  token: string;
}

export interface PermissionGrantedData extends CloudEventData {
  permissionId: string;
  userId: string;
  targetUserId: string;
  fileId?: string;
  folderId?: string;
  role: string;
}

export interface PermissionRevokedData extends CloudEventData {
  permissionId: string;
  userId: string;
  targetUserId: string;
  fileId?: string;
  folderId?: string;
  role: string;
}

export type EventPayload =
  | FileCreatedData
  | FileUpdatedData
  | FileDeletedData
  | FileMovedData
  | FileCopiedData
  | FileUploadedData
  | FileVersionedData
  | FolderCreatedData
  | FolderUpdatedData
  | FolderDeletedData
  | FolderMovedData
  | UserLoginData
  | UserLogoutData
  | UploadStartedData
  | UploadProgressData
  | UploadCompletedData
  | UploadFailedData
  | ShareCreatedData
  | ShareRevokedData
  | PermissionGrantedData
  | PermissionRevokedData;

export type CloudEventType =
  | "file.created"
  | "file.updated"
  | "file.deleted"
  | "file.moved"
  | "file.copied"
  | "file.uploaded"
  | "file.versioned"
  | "folder.created"
  | "folder.updated"
  | "folder.deleted"
  | "folder.moved"
  | "user.login"
  | "user.logout"
  | "upload.started"
  | "upload.progress"
  | "upload.completed"
  | "upload.failed"
  | "share.created"
  | "share.revoked"
  | "permission.granted"
  | "permission.revoked";

export interface EventHandler<T extends EventPayload = EventPayload> {
  (event: T): void | Promise<void>;
}

export interface SerializedEvent {
  eventId: string;
  type: CloudEventType;
  data: EventPayload;
  timestamp: string;
}

export function createEventData(userId?: string): Omit<CloudEventData, "eventId" | "timestamp"> & { eventId: string; timestamp: string } {
  return {
    eventId: uuidv4(),
    timestamp: new Date().toISOString(),
    ...(userId ? { userId } : {}),
  };
}

export function serializeEvent(type: CloudEventType, data: EventPayload): SerializedEvent {
  return {
    eventId: data.eventId,
    type,
    data,
    timestamp: data.timestamp,
  };
}

export function deserializeEvent(raw: string): SerializedEvent {
  return JSON.parse(raw) as SerializedEvent;
}
