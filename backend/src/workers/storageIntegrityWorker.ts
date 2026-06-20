import { Job } from "bullmq";
import { createRuntimeWorker, RuntimeWorker } from "../lib/runtimeQueue";
import { storageAccountingService } from "../services/storageAccountingService";

interface StorageIntegrityJobData {
  userId?: string;
}

export function createStorageIntegrityWorker(): RuntimeWorker {
  const worker = createRuntimeWorker(
    "storage-integrity",
    async (job: Job<StorageIntegrityJobData>) => {
      const repaired = await storageAccountingService.repairStorageIntegrity(job.data.userId);
      if (repaired.length > 0) {
        console.warn("[Integrity] Repaired storage accounting drift", repaired.map((issue) => ({
          ...issue,
          expected: issue.expected.toString(),
          actual: issue.actual.toString(),
        })));
      }
      return { repaired: repaired.length };
    },
    1
  );

  worker.on("failed", (job, err) => {
    console.error(`Storage integrity job ${job?.id} failed:`, err.message);
  });

  return worker;
}
