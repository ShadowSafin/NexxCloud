import { createRuntimeWorker, RuntimeWorker } from "../lib/runtimeQueue";
import { prisma } from "../db";
import { dedupProcessorQueue, fileHashQueue } from "../lib/queues";

export function createMetadataRepairWorker(): RuntimeWorker {
  const worker = createRuntimeWorker(
    "metadata-repair",
    async () => {
      const files = await prisma.file.findMany({
        where: { blobId: { not: null } },
        include: { blob: true },
      });

      let repaired = 0;
      for (const file of files) {
        if (!file.blob) continue;
        const patch: Record<string, unknown> = {};
        if (file.path !== file.blob.physicalPath) patch.path = file.blob.physicalPath;
        if (file.hash !== file.blob.hash) patch.hash = file.blob.hash;
        if (file.size !== file.blob.size) patch.size = file.blob.size;

        if (Object.keys(patch).length > 0) {
          await prisma.file.update({ where: { id: file.id }, data: patch as any });
          repaired++;
        }
      }

      if (repaired > 0) {
        console.warn(`[Integrity] Repaired ${repaired} file metadata record(s)`);
      }

      const legacyFiles = await prisma.file.findMany({
        where: { blobId: null },
        select: { id: true, hash: true },
      });
      let legacyQueued = 0;
      for (const file of legacyFiles) {
        if (file.hash) {
          await dedupProcessorQueue.add("legacy-blob-attach", { fileId: file.id, hash: file.hash });
        } else {
          await fileHashQueue.add("legacy-hash", { fileId: file.id });
        }
        legacyQueued++;
      }

      if (legacyQueued > 0) {
        console.warn(`[Integrity] Queued ${legacyQueued} legacy file(s) for blob attachment`);
      }

      return { repaired, legacyQueued };
    },
    1
  );

  worker.on("failed", (job, err) => {
    console.error(`Metadata repair job ${job?.id} failed:`, err.message);
  });

  return worker;
}
