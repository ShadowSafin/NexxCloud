import { Response } from "express";
import { UploadService } from "../services/uploadService";
import { AuthenticatedRequest } from "../types";
import { BadRequestError } from "../utils/errors";

export class UploadController {
  constructor(private uploadService: UploadService) {}

  initiate = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const { filename, mimeType, totalSize, folderId } = req.body;

    if (!filename || typeof filename !== "string") {
      throw new BadRequestError("filename is required and must be a string");
    }
    if (mimeType === undefined || typeof mimeType !== "string") {
      throw new BadRequestError("mimeType is required and must be a string");
    }
    if (totalSize === undefined || totalSize === null) {
      throw new BadRequestError("totalSize is required");
    }

    const sizeNum = Number(totalSize);
    if (!Number.isFinite(sizeNum) || sizeNum < 0) {
      throw new BadRequestError("totalSize must be a non-negative number");
    }

    const safeMimeType = mimeType || "application/octet-stream";
    const session = await this.uploadService.initiate(userId, filename, safeMimeType, sizeNum, folderId);
    res.status(201).json({ success: true, data: session });
  };

  uploadChunk = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const { sessionId, chunkIndex } = req.params;
    const hash = req.body.hash;

    if (!req.file) {
      throw new BadRequestError("Chunk data is required");
    }

    const chunkIndexNum = parseInt(chunkIndex, 10);
    if (!Number.isInteger(chunkIndexNum) || chunkIndexNum < 0) {
      throw new BadRequestError("Invalid chunk index");
    }

    const result = await this.uploadService.uploadChunkFromFile(
      userId,
      sessionId,
      chunkIndexNum,
      req.file.path,
      BigInt(req.file.size),
      hash
    );

    res.json({ success: true, data: result });
  };

  complete = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const { sessionId } = req.params;

    const file = await this.uploadService.complete(userId, sessionId);
    res.json({ success: true, data: file });
  };

  cancel = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const { sessionId } = req.params;

    const result = await this.uploadService.cancel(userId, sessionId);
    res.json({ success: true, data: result });
  };

  getStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const { sessionId } = req.params;

    const status = await this.uploadService.getStatus(userId, sessionId);
    res.json({ success: true, data: status });
  };

  listSessions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const sessions = await this.uploadService.listSessions(userId);
    res.json({ success: true, data: sessions });
  };

  resume = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const { sessionId } = req.params;
    const info = await this.uploadService.getResumeInfo(userId, sessionId);
    res.json({ success: true, data: info });
  };

  getSessionUploadedChunks = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const { id } = req.params;

    const status = await this.uploadService.getStatus(userId, id);
    const uploadedIndexes = status.chunks
      .filter((c) => c.uploaded)
      .map((c) => c.chunkIndex);

    res.json({
      success: true,
      data: {
        sessionId: status.sessionId,
        status: status.status,
        uploadedChunks: uploadedIndexes,
        totalChunks: status.totalChunks,
      },
    });
  };
}
