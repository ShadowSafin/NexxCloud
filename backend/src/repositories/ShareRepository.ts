import { PrismaClient, Share, Prisma } from "@prisma/client";

export class ShareRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string): Promise<Share | null> {
    return this.prisma.share.findUnique({ where: { id } });
  }

  async findByToken(token: string): Promise<(Share & { file: any }) | null> {
    return this.prisma.share.findUnique({
      where: { token },
      include: { file: true },
    }) as any;
  }

  async findMany(where: Prisma.ShareWhereInput): Promise<Share[]> {
    return this.prisma.share.findMany({ where, orderBy: { createdAt: "desc" } });
  }

  async create(data: Prisma.ShareUncheckedCreateInput): Promise<Share> {
    return this.prisma.share.create({ data });
  }

  async update(id: string, data: Prisma.ShareUpdateInput): Promise<Share> {
    return this.prisma.share.update({ where: { id }, data });
  }

  async delete(id: string): Promise<Share> {
    return this.prisma.share.delete({ where: { id } });
  }

  async incrementViews(id: string): Promise<Share> {
    return this.prisma.share.update({
      where: { id },
      data: { views: { increment: 1 } },
    });
  }
}
