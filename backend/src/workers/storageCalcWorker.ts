import { Job } from "bullmq";
import { createRuntimeWorker, RuntimeWorker } from "../lib/runtimeQueue";
import { prisma } from "../db";

interface StorageCalcJobData {
  userId: string;
}

export function createStorageCalcWorker(): RuntimeWorker {
  const worker = createRuntimeWorker(
    "storage-calc",
    async (job: Job<StorageCalcJobData>) => {
      const { userId } = job.data;
      console.log(`Recalculating storage for user ${userId}`);

      const result = await prisma.file.aggregate({
        where: { userId, deletedAt: null },
        _sum: { size: true },
        _count: true,
      });

      const used = Number(result._sum.size || 0);

      await prisma.user.update({
        where: { id: userId },
        data: { storageUsed: BigInt(used) },
      });

      // Also calculate trash size
      const trashResult = await prisma.file.aggregate({
        where: { userId, deletedAt: { not: null } },
        _sum: { size: true },
      });

      const trashSize = Number(trashResult._sum.size || 0);

      await prisma.user.update({
        where: { id: userId },
        data: { trashSize: BigInt(trashSize) },
      });

      console.log(`User ${userId}: ${used} bytes used, ${trashSize} bytes in trash`);
      return { used, trashSize, fileCount: result._count };
    },
    1
  );

  worker.on("completed", (job) => {
    console.log(`Storage calc job ${job.id} completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(`Storage calc job ${job?.id} failed:`, err.message);
  });

  return worker;
}
