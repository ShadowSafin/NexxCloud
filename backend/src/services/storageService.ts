import fs from "fs";
import path from "path";
import { config } from "../config";
import { prisma } from "../db";
import { cacheGet, cacheSet, cacheInvalidate } from "../lib/redis";

export class StorageService {
  private rootPath: string;

  constructor() {
    this.rootPath = config.storageRoot;
  }

  async initialize(): Promise<void> {
    if (!fs.existsSync(this.rootPath)) {
      fs.mkdirSync(this.rootPath, { recursive: true });
      console.log(`Created storage root: ${this.rootPath}`);
    }
    for (const dir of [this.getBlobsPath(), this.getTempPath()]) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    // Verify storage is writable
    try {
      const testFile = path.join(this.rootPath, ".healthcheck");
      fs.writeFileSync(testFile, "ok");
      fs.unlinkSync(testFile);
      console.log("Storage health check passed");
    } catch (error) {
      console.error("Storage health check failed:", error);
      throw error;
    }
  }

  getUserPath(userId: string): string {
    return path.join(this.rootPath, userId);
  }

  isSafePath(userId: string, targetPath: string): boolean {
    const userPath = path.resolve(this.getUserPath(userId));
    const resolvedPath = path.resolve(targetPath);
    return resolvedPath === userPath || resolvedPath.startsWith(userPath + path.sep);
  }

  isSafePathGlobal(targetPath: string): boolean {
    const globalPath = path.resolve(this.rootPath);
    const resolvedPath = path.resolve(targetPath);
    return resolvedPath === globalPath || resolvedPath.startsWith(globalPath + path.sep);
  }

  getUserFilesPath(userId: string): string {
    return path.join(this.rootPath, userId, "files");
  }

  getUserThumbnailsPath(userId: string): string {
    return path.join(this.rootPath, userId, "thumbnails");
  }

  getUserUploadsPath(userId: string): string {
    return path.join(this.rootPath, userId, "uploads");
  }

  getUserVersionsPath(userId: string): string {
    return path.join(this.rootPath, userId, "versions");
  }

  getBlobsPath(): string {
    return path.join(this.rootPath, "blobs");
  }

  getBlobPath(hash: string): string {
    const normalizedHash = hash.toLowerCase();
    return path.join(this.getBlobsPath(), normalizedHash.slice(0, 2), normalizedHash);
  }

  getTempPath(): string {
    return path.join(this.rootPath, "tmp");
  }

  getFilePath(userId: string, storedName: string): string {
    return path.join(this.getUserFilesPath(userId), storedName);
  }

  getThumbnailPath(userId: string, thumbnailName: string): string {
    return path.join(this.getUserThumbnailsPath(userId), thumbnailName);
  }

  async ensureUserDirectories(userId: string): Promise<void> {
    const dirs = [
      this.getUserPath(userId),
      this.getUserFilesPath(userId),
      this.getUserThumbnailsPath(userId),
      this.getUserUploadsPath(userId),
      this.getUserVersionsPath(userId),
      this.getBlobsPath(),
      this.getTempPath(),
    ];

    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  async deleteFile(userId: string, storedName: string): Promise<void> {
    const filePath = this.getFilePath(userId, storedName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  async deleteFolder(_userId: string, _folderId: string): Promise<void> {
    // This is a no-op since files are stored flat by UUID, not in folder hierarchy
    // The folder is just a DB concept
  }

  async getStorageStats(userId: string): Promise<{ used: number; fileCount: number }> {
    // Check cache first
    const cacheKey = `storage:${userId}`;
    const cached = await cacheGet<{ used: number; fileCount: number }>(cacheKey);
    if (cached) return cached;

    // Query from DB instead of filesystem walk
    const result = await prisma.file.aggregate({
      where: { userId, deletedAt: null },
      _sum: { size: true },
      _count: true,
    });

    const stats = {
      used: Number(result._sum.size || 0),
      fileCount: result._count,
    };

    // Cache for 60 seconds
    await cacheSet(cacheKey, stats, 60);
    return stats;
  }

  async getDiskStats(): Promise<{ totalDisk: number; freeDisk: number; availableDisk: number }> {
    try {
      const stats = await fs.promises.statfs(this.rootPath);
      const availableBlocks = stats.bavail ?? stats.bfree;
      return {
        totalDisk: stats.bsize * stats.blocks,
        freeDisk: stats.bsize * stats.bfree,
        availableDisk: stats.bsize * availableBlocks,
      };
    } catch {
      return { totalDisk: 0, freeDisk: 0, availableDisk: 0 };
    }
  }

  async getStorageInfo(userId: string): Promise<{
    used: number;
    trashSize: number;
  }> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return { used: 0, trashSize: 0 };
    }

    return {
      used: Number(user.storageUsed),
      trashSize: Number(user.trashSize),
    };
  }

  async invalidateCache(userId: string): Promise<void> {
    await cacheInvalidate(`storage:${userId}`);
  }
}

export const storageService = new StorageService();
