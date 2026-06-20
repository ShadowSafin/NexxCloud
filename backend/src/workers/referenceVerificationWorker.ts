import { createRuntimeWorker, RuntimeWorker } from "../lib/runtimeQueue";
import { prisma } from "../db";

export function createReferenceVerificationWorker(): RuntimeWorker {
  const worker = createRuntimeWorker(
    "reference-verification",
    async () => {
      const blobs = await prisma.storageBlob.findMany({ select: { id: true, referenceCount: true } });
      let repaired = 0;

      for (const blob of blobs) {
        const [fileRefs, versionRefs] = await Promise.all([
          prisma.file.count({ where: { blobId: blob.id } }),
          prisma.fileVersion.count({ where: { blobId: blob.id } }),
        ]);
        const expected = fileRefs + versionRefs;
        if (blob.referenceCount !== expected) {
          await prisma.storageBlob.update({
            where: { id: blob.id },
            data: { referenceCount: expected },
          });
          repaired++;
        }
      }

      if (repaired > 0) {
        console.warn(`[Integrity] Repaired ${repaired} blob reference count(s)`);
      }
      return { repaired };
    },
    1
  );

  worker.on("failed", (job, err) => {
    console.error(`Reference verification job ${job?.id} failed:`, err.message);
  });

  return worker;
}
