import { Job } from "bullmq";
import { createRuntimeWorker, RuntimeWorker } from "../lib/runtimeQueue";
import { thumbnailService } from "../services/thumbnailService";

export function createThumbnailWorker(): RuntimeWorker {
  const worker = createRuntimeWorker(
    "thumbnail-generation",
    async (job: Job) => {
      const { fileId } = job.data;
      console.log(`[Worker] Processing thumbnail job for file ${fileId}`);
      try {
        await thumbnailService.processUploadedFile(fileId);
        console.log(`[Worker] Thumbnail job completed for file ${fileId}`);
      } catch (error) {
        console.error(`[Worker] Thumbnail job failed for file ${fileId}:`, error);
        throw error;
      }
    },
    3
  );

  worker.on("completed", (job) => {
    console.log(`Thumbnail job ${job.id} completed for file ${job.data.fileId}`);
  });

  worker.on("failed", (job, err) => {
    console.error(`Thumbnail job ${job?.id} failed:`, err.message);
  });

  return worker;
}
