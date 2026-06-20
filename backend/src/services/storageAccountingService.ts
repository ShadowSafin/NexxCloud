import { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "../db";
import { storageService } from "./storageService";

export interface StorageIntegrityIssue {
  userId: string;
  field: "storageUsed" | "trashSize";
  expected: bigint;
  actual: bigint;
}

export class StorageAccountingService {
  constructor(private db: PrismaClient) {}

  async recalculateStorageUsage(userId: string, tx?: Prisma.TransactionClient): Promise<bigint> {
    const client = tx || this.db;
    const result = await client.file.aggregate({
      where: { userId, deletedAt: null },
      _sum: { size: true },
    });
    const used = BigInt(result._sum.size || 0);
    await client.user.update({
      where: { id: userId },
      data: { storageUsed: used },
    });
    await storageService.invalidateCache(userId);
    return used;
  }

  async recalculateTrashUsage(userId: string, tx?: Prisma.TransactionClient): Promise<bigint> {
    const client = tx || this.db;
    const result = await client.file.aggregate({
      where: { userId, deletedAt: { not: null } },
      _sum: { size: true },
    });
    const trashSize = BigInt(result._sum.size || 0);
    await client.user.update({
      where: { id: userId },
      data: { trashSize },
    });
    await storageService.invalidateCache(userId);
    return trashSize;
  }

  async recalculateUserUsage(userId: string, tx?: Prisma.TransactionClient): Promise<{ storageUsed: bigint; trashSize: bigint }> {
    const client = tx || this.db;
    const [active, trash] = await Promise.all([
      client.file.aggregate({
        where: { userId, deletedAt: null },
        _sum: { size: true },
      }),
      client.file.aggregate({
        where: { userId, deletedAt: { not: null } },
        _sum: { size: true },
      }),
    ]);

    const storageUsed = BigInt(active._sum.size || 0);
    const trashSize = BigInt(trash._sum.size || 0);

    await client.user.update({
      where: { id: userId },
      data: { storageUsed, trashSize },
    });
    await storageService.invalidateCache(userId);
    return { storageUsed, trashSize };
  }

  async applyDelta(
    userId: string,
    delta: { storageUsed?: bigint; trashSize?: bigint },
    tx?: Prisma.TransactionClient
  ): Promise<void> {
    const client = tx || this.db;
    await client.user.update({
      where: { id: userId },
      data: {
        ...(delta.storageUsed ? { storageUsed: { increment: delta.storageUsed } } : {}),
        ...(delta.trashSize ? { trashSize: { increment: delta.trashSize } } : {}),
      },
    });
    await storageService.invalidateCache(userId);
  }

  async verifyStorageIntegrity(userId?: string): Promise<StorageIntegrityIssue[]> {
    const users = userId
      ? await this.db.user.findMany({ where: { id: userId } })
      : await this.db.user.findMany();

    const issues: StorageIntegrityIssue[] = [];
    for (const user of users) {
      const [active, trash] = await Promise.all([
        this.db.file.aggregate({
          where: { userId: user.id, deletedAt: null },
          _sum: { size: true },
        }),
        this.db.file.aggregate({
          where: { userId: user.id, deletedAt: { not: null } },
          _sum: { size: true },
        }),
      ]);

      const expectedStorage = BigInt(active._sum.size || 0);
      const expectedTrash = BigInt(trash._sum.size || 0);

      if (user.storageUsed !== expectedStorage) {
        issues.push({ userId: user.id, field: "storageUsed", expected: expectedStorage, actual: user.storageUsed });
      }
      if (user.trashSize !== expectedTrash) {
        issues.push({ userId: user.id, field: "trashSize", expected: expectedTrash, actual: user.trashSize });
      }
    }
    return issues;
  }

  async repairStorageIntegrity(userId?: string): Promise<StorageIntegrityIssue[]> {
    const issues = await this.verifyStorageIntegrity(userId);
    const userIds = Array.from(new Set(issues.map((issue) => issue.userId)));
    for (const id of userIds) {
      await this.recalculateUserUsage(id);
    }
    return issues;
  }
}

export const storageAccountingService = new StorageAccountingService(prisma);
