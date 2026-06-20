import { PrismaClient, File, Prisma } from "@prisma/client";

export class FileRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string): Promise<File | null> {
    return this.prisma.file.findUnique({
      where: { id },
      include: { versions: true }
    });
  }

  async findByIdAndUser(userId: string, id: string): Promise<File | null> {
    return this.prisma.file.findFirst({
      where: { id, userId },
      include: { versions: true }
    });
  }

  async findByStoredName(storedName: string): Promise<File | null> {
    return this.prisma.file.findUnique({ where: { storedName } });
  }

  async findByHash(hash: string): Promise<File[]> {
    return this.prisma.file.findMany({ where: { hash } });
  }

  async findByHashAndUser(userId: string, hash: string): Promise<File | null> {
    return this.prisma.file.findFirst({
      where: { userId, hash, deletedAt: null }
    });
  }

  async findByNameAndFolder(userId: string, originalName: string, folderId: string | null): Promise<File | null> {
    return this.prisma.file.findFirst({
      where: {
        userId,
        originalName,
        folderId,
        deletedAt: null,
      },
    });
  }

  async create(data: Prisma.FileUncheckedCreateInput): Promise<File> {
    return this.prisma.file.create({ data });
  }

  async update(id: string, data: Prisma.FileUpdateInput | Prisma.FileUncheckedUpdateInput): Promise<File> {
    return this.prisma.file.update({ where: { id }, data: data as any });
  }

  async delete(id: string): Promise<File> {
    return this.prisma.file.delete({ where: { id } });
  }

  async getTrash(userId: string): Promise<File[]> {
    return this.prisma.file.findMany({
      where: { userId, deletedAt: { not: null } },
      orderBy: { deletedAt: "desc" },
    });
  }

  async findAll(params: {
    userId: string;
    folderId?: string | null;
    search?: string;
    category?: string;
    minSize?: number;
    maxSize?: number;
    deletedAt?: Date | null; // null for non-deleted, undefined for any
    isFavorite?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ files: File[]; totalCount: number }> {
    const where: Prisma.FileWhereInput = {
      userId: params.userId,
    };

    if (params.folderId !== undefined) {
      where.folderId = params.folderId;
    }
    
    if (params.deletedAt !== undefined) {
      where.deletedAt = params.deletedAt;
    }

    if (params.search) {
      where.originalName = {
        contains: params.search,
        mode: "insensitive",
      };
    }

    if (params.category) {
      where.category = params.category;
    }

    if (params.isFavorite !== undefined) {
      where.isFavorite = params.isFavorite;
    }

    if (params.minSize !== undefined || params.maxSize !== undefined) {
      where.size = {};
      if (params.minSize !== undefined) {
        where.size.gte = BigInt(params.minSize);
      }
      if (params.maxSize !== undefined) {
        where.size.lte = BigInt(params.maxSize);
      }
    }

    const totalCount = await this.prisma.file.count({ where });

    const files = await this.prisma.file.findMany({
      where,
      orderBy: { originalName: "asc" },
      take: params.limit,
      skip: params.offset,
    });

    return { files, totalCount };
  }

  async getRecent(userId: string, limit: number): Promise<File[]> {
    return this.prisma.file.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  async getFavorites(userId: string): Promise<File[]> {
    return this.prisma.file.findMany({
      where: { userId, isFavorite: true, deletedAt: null },
      orderBy: { originalName: "asc" },
    });
  }

  async bulkTrash(userId: string, ids: string[]): Promise<Prisma.BatchPayload> {
    return this.prisma.file.updateMany({
      where: { id: { in: ids }, userId },
      data: { deletedAt: new Date() },
    });
  }

  async bulkRestore(userId: string, ids: string[]): Promise<Prisma.BatchPayload> {
    return this.prisma.file.updateMany({
      where: { id: { in: ids }, userId },
      data: { deletedAt: null },
    });
  }

  async bulkMove(userId: string, ids: string[], folderId: string | null): Promise<Prisma.BatchPayload> {
    return this.prisma.file.updateMany({
      where: { id: { in: ids }, userId },
      data: { folderId },
    });
  }
}
