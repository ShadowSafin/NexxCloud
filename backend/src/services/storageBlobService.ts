import fs from "fs";
import path from "path";
import crypto from "crypto";
import { pipeline } from "stream/promises";
import { Prisma, PrismaClient, StorageBlob } from "@prisma/client";
import { prisma } from "../db";
import { storageService } from "./storageService";
import { StorageBlobRepository } from "../repositories/StorageBlobRepository";

export class StorageBlobService {
  constructor(private db: PrismaClient) {}

  async computeHash(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash("sha256");
      const stream = fs.createReadStream(filePath);
      stream.on("data", (data) => hash.update(data));
      stream.on("end", () => resolve(hash.digest("hex")));
      stream.on("error", reject);
    });
  }

  getPhysicalPath(hash: string): string {
    return storageService.getBlobPath(hash);
  }

  async ingestFile(
    sourcePath: string,
    size: bigint,
    knownHash?: string,
    tx?: Prisma.TransactionClient
  ): Promise<StorageBlob> {
    const client = tx || this.db;
    const repository = new StorageBlobRepository(client);
    const hash = (knownHash || await this.computeHash(sourcePath)).toLowerCase();
    const destination = this.getPhysicalPath(hash);

    const existing = await repository.findByHash(hash);
    if (existing) {
      await this.ensureExistingBlobFile(sourcePath, existing.physicalPath);
      return repository.incrementReference(existing.id);
    }

    await this.moveIntoBlobStore(sourcePath, destination);

    try {
      return await repository.create({
        hash,
        physicalPath: destination,
        size,
        referenceCount: 1,
      });
    } catch (error: any) {
      if (error?.code !== "P2002") throw error;

      const racedBlob = await repository.findByHash(hash);
      if (!racedBlob) throw error;
      if (destination !== racedBlob.physicalPath && fs.existsSync(destination)) {
        try { fs.unlinkSync(destination); } catch {}
      }
      return repository.incrementReference(racedBlob.id);
    }
  }

  async addReference(blobId: string, tx?: Prisma.TransactionClient): Promise<StorageBlob> {
    return new StorageBlobRepository(tx || this.db).incrementReference(blobId);
  }

  async releaseReference(blobId: string | null | undefined, tx?: Prisma.TransactionClient): Promise<string | null> {
    if (!blobId) return null;

    const client = tx || this.db;
    const repository = new StorageBlobRepository(client);
    const blob = await repository.findById(blobId);
    if (!blob) return null;

    if (blob.referenceCount > 1) {
      await repository.decrementReference(blob.id);
      return null;
    }

    await repository.delete(blob.id);
    return blob.physicalPath;
  }

  async deletePhysicalBlob(filePath: string | null | undefined): Promise<void> {
    if (!filePath || !storageService.isSafePathGlobal(filePath)) return;
    try {
      if (fs.existsSync(filePath)) await fs.promises.unlink(filePath);
      const parent = path.dirname(filePath);
      if (parent !== storageService.getBlobsPath()) {
        await fs.promises.rmdir(parent).catch(() => {});
      }
    } catch {}
  }

  private async ensureExistingBlobFile(sourcePath: string, destination: string): Promise<void> {
    if (fs.existsSync(destination)) {
      try { if (fs.existsSync(sourcePath)) await fs.promises.unlink(sourcePath); } catch {}
      return;
    }
    await this.moveIntoBlobStore(sourcePath, destination);
  }

  private async moveIntoBlobStore(sourcePath: string, destination: string): Promise<void> {
    if (!storageService.isSafePathGlobal(destination)) {
      throw new Error("Refusing to write blob outside storage root");
    }

    await fs.promises.mkdir(path.dirname(destination), { recursive: true });

    if (fs.existsSync(destination)) {
      try { if (fs.existsSync(sourcePath)) await fs.promises.unlink(sourcePath); } catch {}
      return;
    }

    try {
      await fs.promises.rename(sourcePath, destination);
    } catch (error: any) {
      if (error?.code !== "EXDEV") throw error;
      await pipeline(fs.createReadStream(sourcePath), fs.createWriteStream(destination, { flags: "wx" }));
      await fs.promises.unlink(sourcePath).catch(() => {});
    }
  }
}

export const storageBlobService = new StorageBlobService(prisma);
