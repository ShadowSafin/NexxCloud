import { prisma } from "../db";
import { getCacheClient } from "../lib/redis";
import { CloudEventEmitter } from "./EventEmitter";
import {
  CloudEventType,
  EventPayload,
  FileCreatedData,
  FileUpdatedData,
  FileDeletedData,
  FileMovedData,
  FileCopiedData,
  FileUploadedData,
  FileVersionedData,
  FolderCreatedData,
  FolderUpdatedData,
  FolderDeletedData,
  FolderMovedData,
  UserLoginData,
  UserLogoutData,
  UploadStartedData,
  UploadProgressData,
  UploadCompletedData,
  UploadFailedData,
  ShareCreatedData,
  ShareRevokedData,
  PermissionGrantedData,
  PermissionRevokedData,
} from "./types";

const ACTIVITY_EVENTS: Set<CloudEventType> = new Set([
  "file.created",
  "file.updated",
  "file.deleted",
  "file.moved",
  "file.copied",
  "file.uploaded",
  "file.versioned",
  "folder.created",
  "folder.updated",
  "folder.deleted",
  "folder.moved",
  "user.login",
  "user.logout",
  "share.created",
  "share.revoked",
  "permission.granted",
  "permission.revoked",
]);

const NOTIFICATION_EVENTS: Set<CloudEventType> = new Set([
  "file.created",
  "file.deleted",
  "file.moved",
  "file.copied",
  "file.versioned",
  "folder.created",
  "folder.deleted",
  "folder.moved",
  "share.created",
  "share.revoked",
  "permission.granted",
  "permission.revoked",
  "upload.completed",
  "upload.failed",
]);

async function logActivity(type: CloudEventType, data: EventPayload): Promise<void> {
  if (!ACTIVITY_EVENTS.has(type) || !data.userId) return;

  try {
    const { userId, eventId, timestamp, ...details } = data as Record<string, unknown>;

    let fileId: string | undefined;
    let folderId: string | undefined;

    if ("fileId" in data) fileId = (data as any).fileId;
    if ("folderId" in data) folderId = (data as any).folderId;

    await prisma.activityLog.create({
      data: {
        userId: userId as string,
        fileId: fileId || null,
        folderId: folderId || null,
        action: type,
        details: details as any,
      },
    });
  } catch (err) {
    console.error(`Error logging activity for ${type}:`, err);
  }
}

async function sendNotification(type: CloudEventType, data: EventPayload): Promise<void> {
  if (!NOTIFICATION_EVENTS.has(type) || !data.userId) return;

  try {
    const notification = getNotificationForEvent(type, data);
    if (!notification) return;

    await prisma.notification.create({
      data: {
        userId: data.userId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: (notification.data as any) ?? undefined,
      },
    });

    try {
      await getCacheClient().publish(
        `nexxcloud:notifications:${data.userId}`,
        JSON.stringify({
          id: notification.id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          createdAt: new Date().toISOString(),
        }),
      );
    } catch {
    }
  } catch (err) {
    console.error(`Error sending notification for ${type}:`, err);
  }
}

function getNotificationForEvent(
  type: CloudEventType,
  data: EventPayload,
): { id: string; type: string; title: string; message: string; data?: Record<string, unknown> } | null {
  const id = data.eventId;

  switch (type) {
    case "file.created": {
      const d = data as FileCreatedData;
      return {
        id,
        type: "file.created",
        title: "File Created",
        message: `File "${d.fileName}" was created`,
        data: { fileId: d.fileId },
      };
    }
    case "file.deleted": {
      const d = data as FileDeletedData;
      return {
        id,
        type: "file.deleted",
        title: "File Deleted",
        message: `File "${d.fileName}" was deleted`,
        data: { fileId: d.fileId },
      };
    }
    case "file.moved": {
      const d = data as FileMovedData;
      return {
        id,
        type: "file.moved",
        title: "File Moved",
        message: `File "${d.fileName}" was moved`,
        data: { fileId: d.fileId },
      };
    }
    case "file.copied": {
      const d = data as FileCopiedData;
      return {
        id,
        type: "file.copied",
        title: "File Copied",
        message: `File "${d.fileName}" was copied`,
        data: { fileId: d.fileId },
      };
    }
    case "file.versioned": {
      const d = data as FileVersionedData;
      return {
        id,
        type: "file.versioned",
        title: "File Versioned",
        message: `File "${d.fileName}" updated to version ${d.version}`,
        data: { fileId: d.fileId, version: d.version },
      };
    }
    case "folder.created": {
      const d = data as FolderCreatedData;
      return {
        id,
        type: "folder.created",
        title: "Folder Created",
        message: `Folder "${d.folderName}" was created`,
        data: { folderId: d.folderId },
      };
    }
    case "folder.deleted": {
      const d = data as FolderDeletedData;
      return {
        id,
        type: "folder.deleted",
        title: "Folder Deleted",
        message: `Folder "${d.folderName}" was deleted`,
        data: { folderId: d.folderId },
      };
    }
    case "folder.moved": {
      const d = data as FolderMovedData;
      return {
        id,
        type: "folder.moved",
        title: "Folder Moved",
        message: `Folder "${d.folderName}" was moved`,
        data: { folderId: d.folderId },
      };
    }
    case "share.created": {
      const d = data as ShareCreatedData;
      return {
        id,
        type: "share.created",
        title: "Share Created",
        message: `Share created for "${d.fileName}"`,
        data: { shareId: d.shareId, fileId: d.fileId },
      };
    }
    case "share.revoked": {
      const d = data as ShareRevokedData;
      return {
        id,
        type: "share.revoked",
        title: "Share Revoked",
        message: `Share revoked for "${d.fileName}"`,
        data: { shareId: d.shareId, fileId: d.fileId },
      };
    }
    case "permission.granted": {
      const d = data as PermissionGrantedData;
      return {
        id,
        type: "permission.granted",
        title: "Permission Granted",
        message: `You were granted ${d.role} access`,
        data: { permissionId: d.permissionId },
      };
    }
    case "permission.revoked": {
      const d = data as PermissionRevokedData;
      return {
        id,
        type: "permission.revoked",
        title: "Permission Revoked",
        message: `Your ${d.role} access was revoked`,
        data: { permissionId: d.permissionId },
      };
    }
    case "upload.completed": {
      const d = data as UploadCompletedData;
      return {
        id,
        type: "upload.completed",
        title: "Upload Completed",
        message: `File "${d.fileName}" uploaded successfully`,
        data: { fileId: d.fileId },
      };
    }
    case "upload.failed": {
      const d = data as UploadFailedData;
      return {
        id,
        type: "upload.failed",
        title: "Upload Failed",
        message: `Upload failed for "${d.fileName}": ${d.error}`,
        data: {},
      };
    }
    default:
      return null;
  }
}

function broadcastToWebSocket(type: CloudEventType, data: EventPayload): void {
  try {
    const cacheClient = getCacheClient();
    const channel = data.userId
      ? `nexxcloud:ws:${data.userId}`
      : "nexxcloud:ws:broadcast";

    cacheClient.publish(
      channel,
      JSON.stringify({
        type,
        data,
        timestamp: data.timestamp,
      }),
    );
  } catch (err) {
    console.error(`Error broadcasting event ${type} to WebSocket:`, err);
  }
}

export function registerDefaultHandlers(emitter: CloudEventEmitter): void {
  const allTypes: CloudEventType[] = [
    "file.created",
    "file.updated",
    "file.deleted",
    "file.moved",
    "file.copied",
    "file.uploaded",
    "file.versioned",
    "folder.created",
    "folder.updated",
    "folder.deleted",
    "folder.moved",
    "user.login",
    "user.logout",
    "upload.started",
    "upload.progress",
    "upload.completed",
    "upload.failed",
    "share.created",
    "share.revoked",
    "permission.granted",
    "permission.revoked",
  ];

  allTypes.forEach((type) => {
    emitter.on(type, async (data: EventPayload) => {
      await logActivity(type, data);
    });

    emitter.on(type, async (data: EventPayload) => {
      await sendNotification(type, data);
    });

    emitter.on(type, (data: EventPayload) => {
      broadcastToWebSocket(type, data);
    });
  });
}
