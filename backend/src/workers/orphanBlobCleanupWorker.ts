import { createRuntimeWorker, RuntimeWorker } from "../lib/runtimeQueue";
import { prisma } from "../db";
import { storageBlobService } from "../services/storageBlobService";

export function createOrphanBlobCleanupWorker(): RuntimeWorker {
  const worker = createRuntimeWorker(
    "orphan-blob-cleanup",
    async () => {
      const blobs = await prisma.storageBlob.findMany({
        where: { referenceCount: { lte: 0 } },
      });

      let deleted = 0;
      for (const blob of blobs) {
        const [fileRefs, versionRefs] = await Promise.all([
          prisma.file.count({ where: { blobId: blob.id } }),
          prisma.fileVersion.count({ where: { blobId: blob.id } }),
        ]);
        if (fileRefs + versionRefs > 0) continue;

        await prisma.storageBlob.delete({ where: { id: blob.id } });
        await storageBlobService.deletePhysicalBlob(blob.physicalPath);
        deleted++;
      }

      if (deleted > 0) {
        console.warn(`[Integrity] Deleted ${deleted} orphan blob(s)`);
      }
      return { deleted };
    },
    1
  );

  worker.on("failed", (job, err) => {
    console.error(`Orphan blob cleanup job ${job?.id} failed:`, err.message);
  });

  return worker;
}
