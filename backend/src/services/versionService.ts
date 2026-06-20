import { Prisma, PrismaClient } from "@prisma/client";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { pipeline } from "stream/promises";
import { storageService } from "./storageService";
import { storageBlobService } from "./storageBlobService";
import { storageAccountingService } from "./storageAccountingService";
import { versionCleanupQueue } from "../lib/queues";
import { NotFoundError, ForbiddenError } from "../utils/errors";
import { VersionRepository } from "../repositories/VersionRepository";
import { FileRepository } from "../repositories/FileRepository";

export class VersionService {
  private versionRepository: VersionRepository;
  private fileRepository: FileRepository;

  constructor(private prisma: PrismaClient) {
    this.versionRepository = new VersionRepository(prisma);
    this.fileRepository = new FileRepository(prisma);
  }

  async createVersion(userId: string, fileId: string, tx?: Prisma.TransactionClient): Promise<any> {
    const client = tx || this.prisma;
    const file = tx
      ? await client.file.findUnique({ where: { id: fileId } })
      : await this.fileRepository.findById(fileId);
    if (!file) throw new NotFoundError("File not found");
    if (file.userId !== userId) throw new ForbiddenError("Access denied");

    const latestVersion = await client.fileVersion.findFirst({
      where: { fileId },
      orderBy: { version: "desc" },
    });
    const newVersion = (latestVersion?.version || 0) + 1;

    // Version storage directory
    const versionDir = storageService.getUserVersionsPath(userId);
    if (!fs.existsSync(versionDir)) fs.mkdirSync(versionDir, { recursive: true });

    const ext = path.extname(file.originalName);
    const versionStoredName = `${fileId}_v${newVersion}${ext}`;
    const versionPath = path.join(versionDir, versionStoredName);

    // Enforce path traversal defense
    if (!storageService.isSafePathGlobal(file.path)) {
      throw new ForbiddenError("Access denied: Invalid source path");
    }
    if (!storageService.isSafePath(userId, versionPath)) {
      throw new ForbiddenError("Access denied: Invalid destination path");
    }

    if (file.blobId) {
      const blob = await storageBlobService.addReference(file.blobId, tx);
      const version = await client.fileVersion.create({
        data: {
          fileId,
          blobId: blob.id,
          version: newVersion,
          storedName: versionStoredName,
          path: blob.physicalPath,
          size: file.size,
          hash: file.hash,
        },
      });

      await client.file.update({ where: { id: fileId }, data: { currentVersion: newVersion } });
      await versionCleanupQueue.add("cleanup", { fileId }).catch(() => {});
      return version;
    }

    // Legacy records without blob_id still get a physical version copy.
    if (fs.existsSync(file.path)) {
      await pipeline(
        fs.createReadStream(file.path),
        fs.createWriteStream(versionPath)
      );
    }

    // Compute hash using stream
    let hash: string | null = null;
    if (fs.existsSync(versionPath)) {
      hash = await new Promise<string>((resolve, reject) => {
        const hashObj = crypto.createHash("sha256");
        const stream = fs.createReadStream(versionPath);
        stream.on("data", (data) => hashObj.update(data));
        stream.on("end", () => resolve(hashObj.digest("hex")));
        stream.on("error", reject);
      });
    }

    const version = await client.fileVersion.create({
      data: {
        fileId,
        version: newVersion,
        storedName: versionStoredName,
        path: versionPath,
        size: file.size,
        hash,
      },
    });

    // Update file's current version
    await client.file.update({ where: { id: fileId }, data: { currentVersion: newVersion } });

    // Enqueue version cleanup
    await versionCleanupQueue.add("cleanup", { fileId }).catch(() => {});

    return version;
  }

  async listVersions(userId: string, fileId: string) {
    const file = await this.fileRepository.findById(fileId);
    if (!file) throw new NotFoundError("File not found");
    if (file.userId !== userId) throw new ForbiddenError("Access denied");

    return this.versionRepository.findMany({ fileId });
  }

  async restoreVersion(userId: string, fileId: string, versionNumber: number) {
    const file = await this.fileRepository.findById(fileId);
    if (!file) throw new NotFoundError("File not found");
    if (file.userId !== userId) throw new ForbiddenError("Access denied");

    const version = await this.versionRepository.findFirst({ fileId, version: versionNumber });
    if (!version) throw new NotFoundError("Version not found");

    // Enforce path traversal defense
    if (!storageService.isSafePathGlobal(version.path)) {
      throw new ForbiddenError("Access denied: Invalid version path");
    }
    if (!storageService.isSafePathGlobal(file.path)) {
      throw new ForbiddenError("Access denied: Invalid destination path");
    }

    let blobCleanupPath: string | null = null;
    await this.prisma.$transaction(async (tx) => {
      await this.createVersion(userId, fileId, tx);
      if (version.blobId) {
        const blob = await storageBlobService.addReference(version.blobId, tx);
        blobCleanupPath = await storageBlobService.releaseReference(file.blobId, tx);
        await tx.file.update({
          where: { id: fileId },
          data: {
            blobId: blob.id,
            path: blob.physicalPath,
            size: version.size,
            hash: version.hash,
            currentVersion: versionNumber,
          },
        });
      } else {
        if (fs.existsSync(version.path)) {
          await pipeline(
            fs.createReadStream(version.path),
            fs.createWriteStream(file.path)
          );
        }
        await tx.file.update({
          where: { id: fileId },
          data: {
            size: version.size,
            hash: version.hash,
            currentVersion: versionNumber,
          },
        });
      }
      await storageAccountingService.recalculateUserUsage(userId, tx);
    });

    await storageBlobService.deletePhysicalBlob(blobCleanupPath);

    return { restored: versionNumber, fileId };
  }

  async deleteVersion(userId: string, fileId: string, versionNumber: number) {
    const file = await this.fileRepository.findById(fileId);
    if (!file) throw new NotFoundError("File not found");
    if (file.userId !== userId) throw new ForbiddenError("Access denied");

    const version = await this.versionRepository.findFirst({ fileId, version: versionNumber });
    if (!version) throw new NotFoundError("Version not found");

    // Enforce path traversal defense
    if (!storageService.isSafePathGlobal(version.path)) {
      throw new ForbiddenError("Access denied: Invalid version path");
    }

    let blobCleanupPath: string | null = null;
    await this.prisma.$transaction(async (tx) => {
      await tx.fileVersion.delete({ where: { id: version.id } });
      blobCleanupPath = await storageBlobService.releaseReference(version.blobId, tx);
    });

    if (version.blobId) {
      await storageBlobService.deletePhysicalBlob(blobCleanupPath);
    } else {
      try {
        if (fs.existsSync(version.path)) fs.unlinkSync(version.path);
      } catch {}
    }

    return { deleted: versionNumber, fileId };
  }
}
