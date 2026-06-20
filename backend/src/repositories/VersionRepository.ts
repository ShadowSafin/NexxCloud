import { PrismaClient, FileVersion, Prisma } from "@prisma/client";

export class VersionRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string): Promise<FileVersion | null> {
    return this.prisma.fileVersion.findUnique({ where: { id } });
  }

  async findFirst(where: Prisma.FileVersionWhereInput): Promise<FileVersion | null> {
    return this.prisma.fileVersion.findFirst({ where });
  }

  async findLatest(fileId: string): Promise<FileVersion | null> {
    return this.prisma.fileVersion.findFirst({
      where: { fileId },
      orderBy: { version: "desc" },
    });
  }

  async findMany(where: Prisma.FileVersionWhereInput): Promise<FileVersion[]> {
    return this.prisma.fileVersion.findMany({
      where,
      orderBy: { version: "desc" },
    });
  }

  async create(data: Prisma.FileVersionUncheckedCreateInput): Promise<FileVersion> {
    return this.prisma.fileVersion.create({ data });
  }

  async delete(id: string): Promise<FileVersion> {
    return this.prisma.fileVersion.delete({ where: { id } });
  }

  async deleteMany(where: Prisma.FileVersionWhereInput): Promise<Prisma.BatchPayload> {
    return this.prisma.fileVersion.deleteMany({ where });
  }
}
