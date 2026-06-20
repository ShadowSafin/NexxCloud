import { PrismaClient, User, Prisma } from "@prisma/client";

export class UserRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { username } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async create(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({ data });
  }

  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return this.prisma.user.update({ where: { id }, data });
  }

  async updateStorageUsed(id: string, bytes: bigint): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: {
        storageUsed: {
          increment: bytes,
        },
      },
    });
  }

  async updateTrashSize(id: string, bytes: bigint): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: {
        trashSize: {
          increment: bytes,
        },
      },
    });
  }
}
