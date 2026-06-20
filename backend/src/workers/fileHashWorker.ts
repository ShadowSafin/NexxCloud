import { Job } from "bullmq";
import fs from "fs";
import crypto from "crypto";
import { createRuntimeWorker, RuntimeWorker } from "../lib/runtimeQueue";
import { dedupProcessorQueue } from "../lib/queues";
import { prisma } from "../db";

interface FileHashJobData {
  fileId: string;
}

export function createFileHashWorker(): RuntimeWorker {
  const worker = createRuntimeWorker(
    "file-hash",
    async (job: Job<FileHashJobData>) => {
      const { fileId } = job.data;
      console.log(`Computing hash for file ${fileId}`);

      const file = await prisma.file.findUnique({ where: { id: fileId } });
      if (!file) throw new Error(`File ${fileId} not found`);
      if (file.hash) {
        console.log(`File ${fileId} already has hash, skipping`);
        return;
      }

      // Stream-based SHA-256 computation
      const hash = await new Promise<string>((resolve, reject) => {
        const hashObj = crypto.createHash("sha256");
        const stream = fs.createReadStream(file.path);
        stream.on("data", (data) => hashObj.update(data));
        stream.on("end", () => resolve(hashObj.digest("hex")));
        stream.on("error", reject);
      });

      await prisma.file.update({
        where: { id: fileId },
        data: { hash },
      });

      // Enqueue dedup check
      await dedupProcessorQueue.add("dedup", { fileId, hash });

      console.log(`File ${fileId} hash: ${hash}`);
      return { fileId, hash };
    },
    3
  );

  worker.on("completed", (job) => {
    console.log(`File hash job ${job.id} completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(`File hash job ${job?.id} failed:`, err.message);
  });

  return worker;
}
