import { PrismaClient, Prisma, StorageBlob } from "@prisma/client";

export class StorageBlobRepository {
  constructor(private prisma: PrismaClient | Prisma.TransactionClient) {}

  async findById(id: string): Promise<StorageBlob | null> {
    return this.prisma.storageBlob.findUnique({ where: { id } });
  }

  async findByHash(hash: string): Promise<StorageBlob | null> {
    return this.prisma.storageBlob.findUnique({ where: { hash } });
  }

  async create(data: Prisma.StorageBlobUncheckedCreateInput): Promise<StorageBlob> {
    return this.prisma.storageBlob.create({ data });
  }

  async incrementReference(id: string, amount = 1): Promise<StorageBlob> {
    return this.prisma.storageBlob.update({
      where: { id },
      data: { referenceCount: { increment: amount } },
    });
  }

  async decrementReference(id: string, amount = 1): Promise<StorageBlob> {
    return this.prisma.storageBlob.update({
      where: { id },
      data: { referenceCount: { decrement: amount } },
    });
  }

  async update(id: string, data: Prisma.StorageBlobUpdateInput): Promise<StorageBlob> {
    return this.prisma.storageBlob.update({ where: { id }, data });
  }

  async delete(id: string): Promise<StorageBlob> {
    return this.prisma.storageBlob.delete({ where: { id } });
  }
}
