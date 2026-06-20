import { Job } from "bullmq";
import fs from "fs";
import { createRuntimeWorker, RuntimeWorker } from "../lib/runtimeQueue";
import { prisma } from "../db";
import { config } from "../config";
import { storageBlobService } from "../services/storageBlobService";

interface VersionCleanupJobData {
  fileId: string;
}

export function createVersionCleanupWorker(): RuntimeWorker {
  const worker = createRuntimeWorker(
    "version-cleanup",
    async (job: Job<VersionCleanupJobData>) => {
      const { fileId } = job.data;
      const maxVersions = config.maxVersionsPerFile;

      console.log(`Cleaning up versions for file ${fileId} (max: ${maxVersions})`);

      const versions = await prisma.fileVersion.findMany({
        where: { fileId },
        orderBy: { version: "desc" },
      });

      if (versions.length <= maxVersions) {
        return { deleted: 0, remaining: versions.length };
      }

      // Delete oldest versions beyond the limit
      const toDelete = versions.slice(maxVersions);
      let deletedCount = 0;

      for (const version of toDelete) {
        let cleanupPath: string | null = null;
        await prisma.$transaction(async (tx) => {
          await tx.fileVersion.delete({ where: { id: version.id } });
          cleanupPath = await storageBlobService.releaseReference(version.blobId, tx);
        });
        if (version.blobId) {
          await storageBlobService.deletePhysicalBlob(cleanupPath);
        } else {
          try {
            if (fs.existsSync(version.path)) fs.unlinkSync(version.path);
          } catch {}
        }
        deletedCount++;
      }

      console.log(`Cleaned up ${deletedCount} versions for file ${fileId}`);
      return { deleted: deletedCount, remaining: versions.length - deletedCount };
    },
    2
  );

  worker.on("completed", (job) => {
    console.log(`Version cleanup job ${job.id} completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(`Version cleanup job ${job?.id} failed:`, err.message);
  });

  return worker;
}
