import { PrismaClient } from "@prisma/client";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { pipeline } from "stream/promises";
import { storageService } from "./storageService";
import { chunkMergeQueue } from "../lib/queues";
import { BadRequestError, NotFoundError } from "../utils/errors";
import { UploadRepository } from "../repositories/UploadRepository";
import { FolderRepository } from "../repositories/FolderRepository";
import { config } from "../config";

export class UploadService {
  private uploadRepository: UploadRepository;
  private folderRepository: FolderRepository;

  constructor(private prisma: PrismaClient) {
    this.uploadRepository = new UploadRepository(prisma);
    this.folderRepository = new FolderRepository(prisma);
  }

  async initiate(userId: string, filename: string, mimeType: string, totalSize: number, folderId?: string) {
    if (!Number.isFinite(totalSize) || totalSize <= 0) {
      throw new BadRequestError("File size must be greater than zero");
    }

    if (totalSize > config.maxFileSize) {
      throw new BadRequestError(`File exceeds maximum size of ${config.maxFileSize} bytes`);
    }

    const chunkSize = config.uploadChunkSize;
    const totalChunks = Math.ceil(totalSize / chunkSize);

    // Validate folder if provided
    if (folderId) {
      const folder = await this.folderRepository.findById(folderId);
      if (!folder || folder.userId !== userId) throw new NotFoundError("Folder not found");
    }

    // Create upload directory
    const uploadDir = storageService.getUserUploadsPath(userId);
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    const session = await this.uploadRepository.createSession({
      userId,
      filename,
      mimeType,
      totalSize: BigInt(totalSize),
      chunkSize,
      totalChunks,
      folderId: folderId || null,
      status: "uploading",
    });

    // Pre-create chunk records
    const chunkData = [];
    for (let i = 0; i < totalChunks; i++) {
      chunkData.push({
        sessionId: session.id,
        chunkIndex: i,
        path: path.join(uploadDir, "chunks", session.id, `${i}.chunk`),
        size: BigInt(i < totalChunks - 1 ? chunkSize : totalSize - (chunkSize * (totalChunks - 1))),
        uploaded: false,
      });
    }

    await this.uploadRepository.createChunks(chunkData);

    return {
      sessionId: session.id,
      chunkSize,
      totalChunks,
      filename,
      totalSize,
    };
  }

  async uploadChunkFromFile(
    userId: string,
    sessionId: string,
    chunkIndex: number,
    tempPath: string,
    actualSize: bigint,
    hash?: string
  ) {
    const session = await this.uploadRepository.findSessionWithChunks(sessionId);

    if (!session) throw new NotFoundError("Session not found");
    if (session.userId !== userId) throw new BadRequestError("Access denied");
    if (session.status === "completed" || session.status === "cancelled") {
      throw new BadRequestError(`Session is ${session.status}`);
    }

    const chunk = session.chunks.find((c) => c.chunkIndex === chunkIndex);
    if (!chunk) throw new NotFoundError("Chunk not found");
    if (actualSize !== chunk.size) {
      try { if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath); } catch {}
      throw new BadRequestError(`Invalid chunk size. Expected ${chunk.size.toString()} bytes`);
    }

    // Verify hash if provided
    if (hash) {
      const computedHash = await this.computeHash(tempPath);
      if (computedHash !== hash) {
        try { if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath); } catch {}
        throw new BadRequestError("Chunk hash mismatch - data corrupted");
      }
    }

    if (!storageService.isSafePath(userId, chunk.path)) {
      try { if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath); } catch {}
      throw new BadRequestError("Invalid chunk path");
    }

    await fs.promises.mkdir(path.dirname(chunk.path), { recursive: true });
    try {
      await fs.promises.rename(tempPath, chunk.path);
    } catch (error: any) {
      if (error?.code !== "EXDEV") throw error;
      await pipeline(fs.createReadStream(tempPath), fs.createWriteStream(chunk.path));
      await fs.promises.unlink(tempPath).catch(() => {});
    }

    // Mark chunk as uploaded
    await this.uploadRepository.updateChunk(chunk.id, { uploaded: true, hash: hash || null });

    // Update session uploaded count
    const uploadedCount = await this.uploadRepository.countUploadedChunks(sessionId);

    await this.uploadRepository.updateSession(sessionId, {
      uploadedChunks: uploadedCount,
      status: "uploading",
    });

    return {
      chunkIndex,
      uploaded: true,
      progress: uploadedCount / session.totalChunks,
    };
  }

  async complete(userId: string, sessionId: string) {
    const session = await this.uploadRepository.findSessionById(sessionId);

    if (!session) throw new NotFoundError("Session not found");
    if (session.userId !== userId) throw new BadRequestError("Access denied");
    if (session.status === "completed") throw new BadRequestError("Session already completed");
    if (session.status === "cancelled") throw new BadRequestError("Session is cancelled");

    // Check all chunks are uploaded
    const unuploaded = await this.uploadRepository.countUnuploadedChunks(sessionId);

    if (unuploaded > 0) {
      throw new BadRequestError(`${unuploaded} chunks not yet uploaded`);
    }

    // Mark as merging - actual merge happens in background worker
    await this.uploadRepository.updateSession(sessionId, { status: "merging" });

    // Enqueue background merge job
    await chunkMergeQueue.add("merge", { sessionId, userId });

    return {
      sessionId,
      status: "merging",
      message: "Upload complete, merging chunks in background",
    };
  }

  async cancel(userId: string, sessionId: string) {
    const session = await this.uploadRepository.findSessionWithChunks(sessionId);

    if (!session) throw new NotFoundError("Session not found");
    if (session.userId !== userId) throw new BadRequestError("Access denied");

    // Clean up chunk files
    for (const chunk of session.chunks) {
      try {
        if (fs.existsSync(chunk.path)) fs.unlinkSync(chunk.path);
      } catch {}
    }

    await this.uploadRepository.updateSession(sessionId, { status: "cancelled" });

    return { sessionId, status: "cancelled" };
  }

  async getStatus(userId: string, sessionId: string) {
    const session = await this.uploadRepository.findSessionWithChunks(sessionId);

    if (!session) throw new NotFoundError("Session not found");
    if (session.userId !== userId) throw new BadRequestError("Access denied");

    return {
      sessionId: session.id,
      filename: session.filename,
      status: session.status,
      progress: session.totalChunks > 0 ? session.uploadedChunks / session.totalChunks : 0,
      uploadedChunks: session.uploadedChunks,
      totalChunks: session.totalChunks,
      fileId: session.fileId,
      chunks: session.chunks.map((c) => ({
        chunkIndex: c.chunkIndex,
        uploaded: c.uploaded,
        hash: c.hash,
      })),
    };
  }

  async listSessions(userId: string) {
    return this.uploadRepository.listSessions(userId);
  }

  async getResumeInfo(userId: string, sessionId: string) {
    const session = await this.uploadRepository.findSessionWithPendingChunks(sessionId);

    if (!session) throw new NotFoundError("Session not found");
    if (session.userId !== userId) throw new BadRequestError("Access denied");

    return {
      sessionId: session.id,
      filename: session.filename,
      status: session.status,
      totalChunks: session.totalChunks,
      pendingChunks: session.chunks.map((c) => c.chunkIndex),
      chunkSize: session.chunkSize,
    };
  }

  private async computeHash(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash("sha256");
      const stream = fs.createReadStream(filePath);
      stream.on("data", (data) => hash.update(data));
      stream.on("end", () => resolve(hash.digest("hex")));
      stream.on("error", reject);
    });
  }
}
