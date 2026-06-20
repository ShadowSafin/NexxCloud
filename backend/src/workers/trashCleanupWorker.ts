import { Job } from "bullmq";
import fs from "fs";
import { createRuntimeWorker, RuntimeWorker } from "../lib/runtimeQueue";
import { prisma } from "../db";
import { config } from "../config";
import { storageBlobService } from "../services/storageBlobService";
import { storageAccountingService } from "../services/storageAccountingService";

export function createTrashCleanupWorker(): RuntimeWorker {
  const worker = createRuntimeWorker(
    "trash-cleanup",
    async (_job: Job) => {
      const retentionDays = config.trashRetentionDays;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      console.log(`Trash cleanup: deleting items older than ${cutoffDate.toISOString()}`);

      // Find expired trashed files
      const expiredFiles = await prisma.file.findMany({
        where: {
          deletedAt: { not: null, lt: cutoffDate },
        },
      });

      let deletedCount = 0;
      const affectedUsers = new Set<string>();

      for (const file of expiredFiles) {
        const versions = await prisma.fileVersion.findMany({ where: { fileId: file.id } });
        const cleanupPaths: string[] = [];
        await prisma.$transaction(async (tx) => {
          await tx.file.delete({ where: { id: file.id } });
          const fileCleanupPath = await storageBlobService.releaseReference(file.blobId, tx);
          if (fileCleanupPath) cleanupPaths.push(fileCleanupPath);
          for (const version of versions) {
            const versionCleanupPath = await storageBlobService.releaseReference(version.blobId, tx);
            if (versionCleanupPath) cleanupPaths.push(versionCleanupPath);
          }
        });
        for (const cleanupPath of cleanupPaths) {
          await storageBlobService.deletePhysicalBlob(cleanupPath);
        }
        if (!file.blobId) {
          try {
            if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
          } catch {}
        }

        try {
          const thumbFiles = [file.thumbnail, file.thumbnailSmall, file.thumbnailMedium, file.thumbnailLarge].filter(Boolean);
          for (const t of thumbFiles) {
            if (t && fs.existsSync(t)) fs.unlinkSync(t);
          }
        } catch {}

        deletedCount++;
        affectedUsers.add(file.userId);
      }

      // Find expired trashed folders
      const expiredFolders = await prisma.folder.findMany({
        where: {
          deletedAt: { not: null, lt: cutoffDate },
        },
      });

      for (const folder of expiredFolders) {
        affectedUsers.add(folder.userId);
        await permanentDeleteFolderRecursive(folder.id);
      }

      for (const userId of affectedUsers) {
        await storageAccountingService.recalculateUserUsage(userId);
      }

      console.log(`Trash cleanup complete: ${deletedCount} files, ${expiredFolders.length} folders deleted`);
      return { deletedFiles: deletedCount, deletedFolders: expiredFolders.length };
    },
    1
  );

  worker.on("completed", (job) => {
    console.log(`Trash cleanup job ${job.id} completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(`Trash cleanup job ${job?.id} failed:`, err.message);
  });

  return worker;
}

async function permanentDeleteFolderRecursive(folderId: string): Promise<void> {
  // Get all child folders
  const children = await prisma.folder.findMany({
    where: { parentId: folderId },
  });

  for (const child of children) {
    await permanentDeleteFolderRecursive(child.id);
  }

  // Delete all files in this folder
  const files = await prisma.file.findMany({
    where: { folderId },
  });

  for (const file of files) {
    const versions = await prisma.fileVersion.findMany({ where: { fileId: file.id } });
    const cleanupPaths: string[] = [];
    await prisma.$transaction(async (tx) => {
      await tx.file.delete({ where: { id: file.id } });
      const fileCleanupPath = await storageBlobService.releaseReference(file.blobId, tx);
      if (fileCleanupPath) cleanupPaths.push(fileCleanupPath);
      for (const version of versions) {
        const versionCleanupPath = await storageBlobService.releaseReference(version.blobId, tx);
        if (versionCleanupPath) cleanupPaths.push(versionCleanupPath);
      }
    });
    for (const cleanupPath of cleanupPaths) {
      await storageBlobService.deletePhysicalBlob(cleanupPath);
    }
    if (!file.blobId) {
      try {
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      } catch {}
    }
  }

  // Delete the folder
  await prisma.folder.delete({ where: { id: folderId } });
}
