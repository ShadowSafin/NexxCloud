import { Job } from "bullmq";
import fs from "fs";
import path from "path";
import { createRuntimeWorker, RuntimeWorker } from "../lib/runtimeQueue";
import { prisma } from "../db";
import { storageBlobService } from "../services/storageBlobService";
import { storageService } from "../services/storageService";

interface DedupJobData {
  fileId: string;
  hash: string;
}

export function createDedupProcessorWorker(): RuntimeWorker {
  const worker = createRuntimeWorker(
    "dedup-processor",
    async (job: Job<DedupJobData>) => {
      const { fileId, hash } = job.data;
      console.log(`Checking dedup for file ${fileId} (hash: ${hash})`);

      const file = await prisma.file.findUnique({ where: { id: fileId } });
      if (!file) throw new Error(`File ${fileId} not found`);
      if (!hash) return { deduplicated: false, reason: "no hash" };

      if (file.blobId) {
        return { deduplicated: false, reason: "already blob-backed" };
      }

      if (!fs.existsSync(file.path)) {
        return { deduplicated: false, reason: "file missing" };
      }

      await fs.promises.mkdir(storageService.getTempPath(), { recursive: true });
      const tempCopyPath = path.join(storageService.getTempPath(), `${file.id}-${Date.now()}`);
      await fs.promises.copyFile(file.path, tempCopyPath);

      const blob = await storageBlobService.ingestFile(tempCopyPath, file.size, hash);
      try {
        await prisma.file.update({
          where: { id: fileId },
          data: {
            blobId: blob.id,
            path: blob.physicalPath,
            refCount: blob.referenceCount,
          },
        });
      } catch (error) {
        const cleanupPath = await storageBlobService.releaseReference(blob.id).catch(() => null);
        await storageBlobService.deletePhysicalBlob(cleanupPath);
        throw error;
      }

      if (storageService.isSafePathGlobal(file.path)) {
        await fs.promises.unlink(file.path).catch(() => {});
      }

      console.log(`File ${fileId} attached to blob ${blob.id}`);
      return { deduplicated: true, blobId: blob.id };
    },
    2
  );

  worker.on("completed", (job) => {
    console.log(`Dedup job ${job.id} completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(`Dedup job ${job?.id} failed:`, err.message);
  });

  return worker;
}
