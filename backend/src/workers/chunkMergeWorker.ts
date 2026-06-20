import { Job } from "bullmq";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { File } from "@prisma/client";
import { createRuntimeWorker, RuntimeWorker } from "../lib/runtimeQueue";
import { thumbnailQueue } from "../lib/queues";
import { prisma } from "../db";
import { storageService } from "../services/storageService";
import { fileTypeService } from "../services/fileTypeService";
import { VersionService } from "../services/versionService";
import { storageBlobService } from "../services/storageBlobService";
import { storageAccountingService } from "../services/storageAccountingService";

interface ChunkMergeJobData {
  sessionId: string;
  userId: string;
}

export function createChunkMergeWorker(): RuntimeWorker {
  const worker = createRuntimeWorker(
    "chunk-merge",
    async (job: Job<ChunkMergeJobData>) => {
      const { sessionId, userId } = job.data;
      console.log(`Merging chunks for session ${sessionId}`);

      const session = await prisma.uploadSession.findUnique({
        where: { id: sessionId },
        include: { chunks: { orderBy: { chunkIndex: "asc" } } },
      });

      if (!session) throw new Error(`Session ${sessionId} not found`);
      if (session.status === "completed" || session.status === "cancelled") {
        console.log(`Session ${sessionId} already ${session.status}, skipping`);
        return;
      }

      // Merge chunks into final file using streams
      const ext = path.extname(session.filename);
      const storedName = `${sessionId}${ext}`;
      const filePath = path.join(storageService.getUserUploadsPath(userId), `${sessionId}_merged`);

      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      // Stream-based merge with SHA-256 computation
      const hash = crypto.createHash("sha256");
      const writeStream = fs.createWriteStream(filePath);

      for (const chunk of session.chunks) {
        if (!fs.existsSync(chunk.path)) {
          throw new Error(`Chunk file missing: ${chunk.path}`);
        }

        await new Promise<void>((resolve, reject) => {
          const readStream = fs.createReadStream(chunk.path);
          readStream.on("data", (chunk: string | Buffer) => {
            const data = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
            hash.update(data);
            if (!writeStream.write(data)) {
              readStream.pause();
              writeStream.once("drain", () => readStream.resume());
            }
          });
          readStream.on("end", () => resolve());
          readStream.on("error", reject);
        });
      }

      writeStream.end();
      await new Promise<void>((resolve, reject) => {
        writeStream.on("finish", resolve);
        writeStream.on("error", reject);
      });

      // Dynamic Binary Signature Validation (Magic-Number validation)
      const isSignatureValid = await fileTypeService.validateSignature(filePath, session.mimeType);
      if (!isSignatureValid) {
        try {
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        } catch {}
        throw new Error("File signature mismatch: the file contents do not match the expected type or extension");
      }

      const fileHash = hash.digest("hex");
      const versionService = new VersionService(prisma);
      const blob = await storageBlobService.ingestFile(filePath, BigInt(Number(session.totalSize)), fileHash);

      // Check for duplicate filename in the same folder
      const existingFileWithName = await prisma.file.findFirst({
        where: {
          originalName: session.filename,
          folderId: session.folderId,
          userId,
          deletedAt: null,
        },
      });

      const fileInfo = fileTypeService.getFileInfo(session.filename, session.mimeType);
      let file: File | null = null;
      let mergedFileId = "";
      let blobCleanupPath: string | null = null;

      try {
        await prisma.$transaction(async (tx) => {
          if (existingFileWithName) {
            await versionService.createVersion(userId, existingFileWithName.id, tx);
            blobCleanupPath = await storageBlobService.releaseReference(existingFileWithName.blobId, tx);

            file = await tx.file.update({
              where: { id: existingFileWithName.id },
              data: {
                blobId: blob.id,
                storedName,
                path: blob.physicalPath,
                mimeType: session.mimeType,
                extension: fileInfo.extension,
                category: fileInfo.category,
                size: BigInt(Number(session.totalSize)),
                hash: fileHash,
                refCount: blob.referenceCount,
                thumbnail: null,
                thumbnailSmall: null,
                thumbnailMedium: null,
                thumbnailLarge: null,
              },
            });
          } else {
            file = await tx.file.create({
              data: {
                userId,
                folderId: session.folderId,
                blobId: blob.id,
                originalName: session.filename,
                storedName,
                path: blob.physicalPath,
                mimeType: session.mimeType,
                extension: fileInfo.extension,
                category: fileInfo.category,
                size: BigInt(Number(session.totalSize)),
                hash: fileHash,
                refCount: blob.referenceCount,
              },
            });
          }

          if (!file) {
            throw new Error("Chunk merge completed without creating or updating a file record");
          }
          mergedFileId = file.id;

          await tx.uploadSession.update({
            where: { id: sessionId },
            data: { status: "completed", completedAt: new Date(), hash: fileHash, fileId: mergedFileId },
          });

          await storageAccountingService.recalculateUserUsage(userId, tx);
        });
      } catch (error) {
        const cleanup = await storageBlobService.releaseReference(blob.id).catch(() => null);
        await storageBlobService.deletePhysicalBlob(cleanup);
        throw error;
      } finally {
        await storageBlobService.deletePhysicalBlob(blobCleanupPath);
      }

      if (!mergedFileId) {
        throw new Error("Chunk merge completed without a file record");
      }

      // Clean up chunk files
      for (const chunk of session.chunks) {
        try { fs.unlinkSync(chunk.path); } catch {}
      }

      // Enqueue thumbnail generation
      if (fileInfo.canThumbnail) {
        await thumbnailQueue.add("generate", { fileId: mergedFileId }).catch((err) => {
          console.error("Failed to enqueue thumbnail job:", err.message);
        });
      }

      console.log(`Session ${sessionId} merged successfully. File: ${mergedFileId}`);
      return { fileId: mergedFileId, hash: fileHash };
    },
    2
  );

  worker.on("completed", (job) => {
    console.log(`Chunk merge job ${job.id} completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(`Chunk merge job ${job?.id} failed:`, err.message);
    // Mark session as failed
    if (job?.data?.sessionId) {
      prisma.uploadSession.update({
        where: { id: job.data.sessionId },
        data: { status: "failed" },
      }).catch(() => {});
    }
  });

  return worker;
}
