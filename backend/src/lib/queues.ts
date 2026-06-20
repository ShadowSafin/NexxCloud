import { createRuntimeQueue } from "./runtimeQueue";

const defaultOpts = {
  removeOnComplete: 100,
  removeOnFail: 50,
};

export const thumbnailQueue = createRuntimeQueue("thumbnail-generation", {
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
    ...defaultOpts,
});

export const chunkMergeQueue = createRuntimeQueue("chunk-merge", {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
    ...defaultOpts,
});

export const trashCleanupQueue = createRuntimeQueue("trash-cleanup", {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    ...defaultOpts,
});

export const fileHashQueue = createRuntimeQueue("file-hash", {
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
    ...defaultOpts,
});

export const dedupProcessorQueue = createRuntimeQueue("dedup-processor", {
    attempts: 2,
    backoff: { type: "exponential", delay: 3000 },
    ...defaultOpts,
});

export const versionCleanupQueue = createRuntimeQueue("version-cleanup", {
    attempts: 2,
    backoff: { type: "exponential", delay: 2000 },
    ...defaultOpts,
});

export const storageCalcQueue = createRuntimeQueue("storage-calc", {
    attempts: 2,
    backoff: { type: "exponential", delay: 2000 },
    ...defaultOpts,
});

export const storageIntegrityQueue = createRuntimeQueue("storage-integrity", {
    attempts: 2,
    backoff: { type: "exponential", delay: 2000 },
    ...defaultOpts,
});

export const orphanBlobCleanupQueue = createRuntimeQueue("orphan-blob-cleanup", {
    attempts: 2,
    backoff: { type: "exponential", delay: 2000 },
    ...defaultOpts,
});

export const referenceVerificationQueue = createRuntimeQueue("reference-verification", {
    attempts: 2,
    backoff: { type: "exponential", delay: 2000 },
    ...defaultOpts,
});

export const chunkCleanupQueue = createRuntimeQueue("chunk-cleanup", {
    attempts: 2,
    backoff: { type: "exponential", delay: 2000 },
    ...defaultOpts,
});

export const metadataRepairQueue = createRuntimeQueue("metadata-repair", {
    attempts: 2,
    backoff: { type: "exponential", delay: 2000 },
    ...defaultOpts,
});

export const allQueues = [
  thumbnailQueue,
  chunkMergeQueue,
  trashCleanupQueue,
  fileHashQueue,
  dedupProcessorQueue,
  versionCleanupQueue,
  storageCalcQueue,
  storageIntegrityQueue,
  orphanBlobCleanupQueue,
  referenceVerificationQueue,
  chunkCleanupQueue,
  metadataRepairQueue,
];
