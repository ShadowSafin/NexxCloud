import { PrismaClient, Folder, File, Prisma } from "@prisma/client";

export type FolderWithRelations = Folder & {
  children: Folder[];
  files: File[];
};

export class FolderRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string): Promise<FolderWithRelations | null> {
    return this.prisma.folder.findUnique({
      where: { id },
      include: { children: true, files: true },
    }) as Promise<FolderWithRelations | null>;
  }

  async findByIdAndUser(userId: string, id: string): Promise<FolderWithRelations | null> {
    return this.prisma.folder.findFirst({
      where: { id, userId },
      include: { children: true, files: true },
    }) as Promise<FolderWithRelations | null>;
  }

  async findFirst(where: Prisma.FolderWhereInput): Promise<Folder | null> {
    return this.prisma.folder.findFirst({ where });
  }

  async findMany(where: Prisma.FolderWhereInput): Promise<Folder[]> {
    return this.prisma.folder.findMany({ where, orderBy: { name: "asc" } });
  }

  async create(data: Prisma.FolderUncheckedCreateInput): Promise<Folder> {
    return this.prisma.folder.create({ data });
  }

  async update(id: string, data: Prisma.FolderUpdateInput | Prisma.FolderUncheckedUpdateInput): Promise<Folder> {
    return this.prisma.folder.update({ where: { id }, data: data as any });
  }

  async delete(id: string): Promise<Folder> {
    return this.prisma.folder.delete({ where: { id } });
  }

  async bulkTrash(userId: string, ids: string[]): Promise<Prisma.BatchPayload> {
    return this.prisma.folder.updateMany({
      where: { id: { in: ids }, userId },
      data: { deletedAt: new Date() },
    });
  }
}
