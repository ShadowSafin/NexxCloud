import {
  chunkCleanupQueue,
  metadataRepairQueue,
  orphanBlobCleanupQueue,
  referenceVerificationQueue,
  storageIntegrityQueue,
  trashCleanupQueue,
} from "../lib/queues";
import { RuntimeWorker } from "../lib/runtimeQueue";
import { createThumbnailWorker } from "./thumbnailWorker";
import { createChunkMergeWorker } from "./chunkMergeWorker";
import { createTrashCleanupWorker } from "./trashCleanupWorker";
import { createFileHashWorker } from "./fileHashWorker";
import { createDedupProcessorWorker } from "./dedupProcessorWorker";
import { createVersionCleanupWorker } from "./versionCleanupWorker";
import { createStorageCalcWorker } from "./storageCalcWorker";
import { createStorageIntegrityWorker } from "./storageIntegrityWorker";
import { createOrphanBlobCleanupWorker } from "./orphanBlobCleanupWorker";
import { createReferenceVerificationWorker } from "./referenceVerificationWorker";
import { createChunkCleanupWorker } from "./chunkCleanupWorker";
import { createMetadataRepairWorker } from "./metadataRepairWorker";

export function startAllWorkers(): RuntimeWorker[] {
  const workers: RuntimeWorker[] = [];

  // Thumbnail generation (existing)
  workers.push(createThumbnailWorker());

  // Chunk merge (new)
  workers.push(createChunkMergeWorker());

  // Trash cleanup (new)
  workers.push(createTrashCleanupWorker());

  // File hashing (new)
  workers.push(createFileHashWorker());

  // Deduplication (new)
  workers.push(createDedupProcessorWorker());

  // Version cleanup (new)
  workers.push(createVersionCleanupWorker());

  // Storage calculation (new)
  workers.push(createStorageCalcWorker());

  workers.push(createStorageIntegrityWorker());
  workers.push(createOrphanBlobCleanupWorker());
  workers.push(createReferenceVerificationWorker());
  workers.push(createChunkCleanupWorker());
  workers.push(createMetadataRepairWorker());

  // Schedule daily trash cleanup at 2 AM
  trashCleanupQueue.add("cleanup", {}, {
    repeat: { pattern: "0 2 * * *" },
    removeOnComplete: 10,
    removeOnFail: 5,
  }).catch((err) => {
    console.error("Failed to schedule trash cleanup:", err.message);
  });

  storageIntegrityQueue.add("repair", {}, {
    repeat: { pattern: "15 2 * * *" },
    removeOnComplete: 10,
    removeOnFail: 5,
  }).catch((err) => {
    console.error("Failed to schedule storage integrity repair:", err.message);
  });

  referenceVerificationQueue.add("verify", {}, {
    repeat: { pattern: "30 2 * * *" },
    removeOnComplete: 10,
    removeOnFail: 5,
  }).catch((err) => {
    console.error("Failed to schedule reference verification:", err.message);
  });

  metadataRepairQueue.add("repair", {}, {
    repeat: { pattern: "45 2 * * *" },
    removeOnComplete: 10,
    removeOnFail: 5,
  }).catch((err) => {
    console.error("Failed to schedule metadata repair:", err.message);
  });

  orphanBlobCleanupQueue.add("cleanup", {}, {
    repeat: { pattern: "0 3 * * *" },
    removeOnComplete: 10,
    removeOnFail: 5,
  }).catch((err) => {
    console.error("Failed to schedule orphan blob cleanup:", err.message);
  });

  chunkCleanupQueue.add("cleanup", {}, {
    repeat: { pattern: "*/30 * * * *" },
    removeOnComplete: 10,
    removeOnFail: 5,
  }).catch((err) => {
    console.error("Failed to schedule chunk cleanup:", err.message);
  });

  console.log(`Started ${workers.length} workers`);
  return workers;
}

export async function stopAllWorkers(workers: RuntimeWorker[]): Promise<void> {
  console.log("Stopping all workers...");
  await Promise.all(workers.map((w) => w.close()));
  console.log("All workers stopped");
}
