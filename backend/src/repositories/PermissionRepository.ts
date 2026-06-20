import { PrismaClient, Permission, Prisma } from "@prisma/client";

export class PermissionRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string): Promise<Permission | null> {
    return this.prisma.permission.findUnique({ where: { id } });
  }

  async findUserFilePermission(userId: string, fileId: string): Promise<Permission | null> {
    return this.prisma.permission.findUnique({
      where: { userId_fileId: { userId, fileId } },
    });
  }

  async findUserFolderPermission(userId: string, folderId: string): Promise<Permission | null> {
    return this.prisma.permission.findUnique({
      where: { userId_folderId: { userId, folderId } },
    });
  }

  async create(data: Prisma.PermissionUncheckedCreateInput): Promise<Permission> {
    return this.prisma.permission.create({ data });
  }

  async update(id: string, data: Prisma.PermissionUpdateInput): Promise<Permission> {
    return this.prisma.permission.update({ where: { id }, data });
  }

  async delete(id: string): Promise<Permission> {
    return this.prisma.permission.delete({ where: { id } });
  }
}
