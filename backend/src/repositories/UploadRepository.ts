import { PrismaClient, UploadSession, UploadChunk, Prisma } from "@prisma/client";

export class UploadRepository {
  constructor(private prisma: PrismaClient) {}

  async findSessionById(id: string): Promise<UploadSession | null> {
    return this.prisma.uploadSession.findUnique({ where: { id } });
  }

  async findSessionWithChunks(id: string): Promise<(UploadSession & { chunks: UploadChunk[] }) | null> {
    return this.prisma.uploadSession.findUnique({
      where: { id },
      include: { chunks: true },
    });
  }

  async findSessionWithPendingChunks(id: string): Promise<(UploadSession & { chunks: { chunkIndex: number }[] }) | null> {
    return this.prisma.uploadSession.findUnique({
      where: { id },
      include: {
        chunks: {
          where: { uploaded: false },
          select: { chunkIndex: true },
          orderBy: { chunkIndex: "asc" },
        },
      },
    }) as any;
  }

  async createSession(data: Prisma.UploadSessionUncheckedCreateInput): Promise<UploadSession> {
    return this.prisma.uploadSession.create({ data });
  }

  async updateSession(id: string, data: Prisma.UploadSessionUpdateInput): Promise<UploadSession> {
    return this.prisma.uploadSession.update({ where: { id }, data });
  }

  async countUploadedChunks(sessionId: string): Promise<number> {
    return this.prisma.uploadChunk.count({
      where: { sessionId, uploaded: true },
    });
  }

  async countUnuploadedChunks(sessionId: string): Promise<number> {
    return this.prisma.uploadChunk.count({
      where: { sessionId, uploaded: false },
    });
  }

  async createChunks(data: Prisma.UploadChunkCreateManyInput[]): Promise<Prisma.BatchPayload> {
    return this.prisma.uploadChunk.createMany({ data });
  }

  async updateChunk(id: string, data: Prisma.UploadChunkUpdateInput): Promise<UploadChunk> {
    return this.prisma.uploadChunk.update({ where: { id }, data });
  }

  async listSessions(userId: string): Promise<UploadSession[]> {
    return this.prisma.uploadSession.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }
}
