import fs from "fs";
import path from "path";
import { createRuntimeWorker, RuntimeWorker } from "../lib/runtimeQueue";
import { prisma } from "../db";
import { storageService } from "../services/storageService";

async function cleanupTemporaryChunks(cutoff: Date): Promise<number> {
  let temporaryChunksDeleted = 0;
  const storageRoot = path.dirname(storageService.getBlobsPath());

  const userDirectories = await fs.promises.readdir(storageRoot, { withFileTypes: true }).catch(() => []);
  for (const directory of userDirectories) {
    if (!directory.isDirectory()) continue;

    const tempDirectory = path.join(storageRoot, directory.name, "uploads", "chunks-tmp");
    if (!storageService.isSafePathGlobal(tempDirectory)) continue;

    const entries = await fs.promises.readdir(tempDirectory, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".chunk")) continue;

      const tempPath = path.join(tempDirectory, entry.name);
      try {
        const stats = await fs.promises.stat(tempPath);
        if (stats.mtime < cutoff) {
          await fs.promises.unlink(tempPath);
          temporaryChunksDeleted++;
        }
      } catch {}
    }
  }

  return temporaryChunksDeleted;
}

export function createChunkCleanupWorker(): RuntimeWorker {
  const worker = createRuntimeWorker(
    "chunk-cleanup",
    async () => {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const staleSessions = await prisma.uploadSession.findMany({
        where: {
          status: { in: ["pending", "uploading", "failed", "cancelled"] },
          updatedAt: { lt: cutoff },
        },
        include: { chunks: true },
      });

      let chunksDeleted = 0;
      for (const session of staleSessions) {
        for (const chunk of session.chunks) {
          try {
            if (fs.existsSync(chunk.path)) {
              fs.unlinkSync(chunk.path);
              chunksDeleted++;
            }
          } catch {}
        }
        if (session.status !== "cancelled") {
          await prisma.uploadSession.update({
            where: { id: session.id },
            data: { status: "cancelled" },
          });
        }
      }

      const temporaryChunksDeleted = await cleanupTemporaryChunks(cutoff);

      if (chunksDeleted > 0 || temporaryChunksDeleted > 0) {
        console.warn(
          `[Integrity] Cleaned up ${chunksDeleted} stale upload chunk(s) and ${temporaryChunksDeleted} abandoned temporary chunk(s)`
        );
      }
      return { sessions: staleSessions.length, chunksDeleted, temporaryChunksDeleted };
    },
    1
  );

  worker.on("failed", (job, err) => {
    console.error(`Chunk cleanup job ${job?.id} failed:`, err.message);
  });

  return worker;
}
