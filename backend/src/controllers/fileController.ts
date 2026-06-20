import { Response } from "express";
import { randomUUID } from "crypto";
import path from "path";
import fs from "fs";
import { BulkDownloadEntry, FileService } from "../services/fileService";
import { AuthenticatedRequest } from "../types";
import { BadRequestError, NotFoundError, ForbiddenError } from "../utils/errors";
import { storageService } from "../services/storageService";
import { fileTypeService } from "../services/fileTypeService";

type ZipArchiveInstance = NodeJS.ReadWriteStream & {
  append: (source: string | Buffer, data: { name: string }) => ZipArchiveInstance;
  file: (filename: string, data: { name: string; date?: Date }) => ZipArchiveInstance;
  finalize: () => Promise<void>;
};

const { ZipArchive } = require("archiver") as {
  ZipArchive: new (options?: { forceZip64?: boolean; store?: boolean; zlib?: { level?: number } }) => ZipArchiveInstance;
};

const BULK_DOWNLOAD_TICKET_TTL_MS = 10 * 60 * 1000;
const MAX_BULK_DOWNLOAD_SELECTION_IDS = 5000;

interface BulkDownloadTicket {
  userId: string;
  entries: BulkDownloadEntry[];
  totalBytes: bigint;
  fileCount: number;
  folderCount: number;
  expiresAt: number;
}

const bulkDownloadTickets = new Map<string, BulkDownloadTicket>();

const pruneExpiredBulkDownloadTickets = () => {
  const now = Date.now();
  for (const [ticket, value] of bulkDownloadTickets.entries()) {
    if (value.expiresAt <= now) {
      bulkDownloadTickets.delete(ticket);
    }
  }
};

const readIdArray = (value: unknown, name: string): string[] => {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    throw new BadRequestError(`${name} must be an array`);
  }

  return Array.from(new Set(value.filter((id): id is string => typeof id === "string" && id.trim().length > 0)));
};

const summarizeBulkDownloadEntries = (entries: BulkDownloadEntry[]) => {
  let totalBytes = BigInt(0);
  let fileCount = 0;
  let folderCount = 0;

  for (const entry of entries) {
    if (entry.type === "file") {
      totalBytes += entry.file.size;
      fileCount++;
    } else {
      folderCount++;
    }
  }

  return { totalBytes, fileCount, folderCount };
};

const shouldSandbox = (mimeType: string, extension: string): boolean => {
  const category = fileTypeService.getCategory(mimeType, extension);
  const ext = (extension || "").toLowerCase();
  const mime = mimeType.toLowerCase();

  return (
    fileTypeService.isDangerous(mimeType, extension) ||
    category === "code" ||
    category === "executables" ||
    category === "databases" ||
    category === "unknown" ||
    mime.startsWith("text/") ||
    mime === "image/svg+xml" ||
    ext === ".html" ||
    ext === ".htm" ||
    ext === ".svg" ||
    ext === ".xml" ||
    ext === ".js" ||
    ext === ".json"
  );
};

export class FileController {
  constructor(private fileService: FileService) {}

  upload = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    if (!req.file) {
      throw new BadRequestError("No file provided");
    }

    const userId = req.user!.id;
    const folderId = req.body.folderId || undefined;

    const file = await this.fileService.create(userId, req.file, folderId);

    res.status(201).json({
      success: true,
      data: file,
      message: "File uploaded successfully",
    });
  };

  uploadMultiple = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
      throw new BadRequestError("No files provided");
    }

    const userId = req.user!.id;
    const folderId = req.body.folderId || undefined;
    const files = req.files as Express.Multer.File[];

    const uploadedFiles = await Promise.all(
      files.map((file) => this.fileService.create(userId, file, folderId))
    );

    res.status(201).json({
      success: true,
      data: uploadedFiles,
      message: `${uploadedFiles.length} file(s) uploaded successfully`,
    });
  };

  findAll = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const userId = req.user!.id;
    const folderId = req.query.folderId as string | undefined;
    const search = req.query.search as string | undefined;
    const category = req.query.category as string | undefined;
    const minSize = req.query.minSize ? Number(req.query.minSize) : undefined;
    const maxSize = req.query.maxSize ? Number(req.query.maxSize) : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const offset = req.query.offset ? Number(req.query.offset) : undefined;

    const { files, totalCount } = await this.fileService.findAll(userId, folderId, search, {
      category,
      minSize,
      maxSize,
      limit,
      offset,
    });

    res.status(200).json({
      success: true,
      data: files,
      pagination: {
        total: totalCount,
        limit: limit ?? files.length,
        offset: offset ?? 0,
      },
    });
  };

  findById = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const userId = req.user!.id;
    const { id } = req.params;

    const file = await this.fileService.findById(userId, id);

    res.status(200).json({
      success: true,
      data: file,
    });
  };

  download = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const userId = req.user!.id;
    const { id } = req.params;

    const file = await this.fileService.findById(userId, id);
    const filePath = await this.fileService.getFilePath(userId, id);

    // Enforce path traversal defense
    if (!storageService.isSafePathGlobal(filePath)) {
      throw new ForbiddenError("Access denied: Invalid file path");
    }

    if (!fs.existsSync(filePath)) {
      throw new NotFoundError("File not found on disk");
    }

    if (shouldSandbox(file.mimeType, file.extension)) {
      res.setHeader("Content-Security-Policy", "default-src 'none'; sandbox;");
    }

    res.setHeader("Content-Type", file.mimeType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(file.originalName)}"`
    );

    res.sendFile(path.resolve(filePath));
  };

  createBulkDownloadTicket = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const userId = req.user!.id;
    const itemIds = readIdArray(req.body.itemIds, "itemIds");
    const fileIds = readIdArray(req.body.fileIds, "fileIds");
    const folderIds = readIdArray(req.body.folderIds, "folderIds");

    if (itemIds.length + fileIds.length + folderIds.length === 0) {
      throw new BadRequestError("Select at least one file or folder to download");
    }
    if (itemIds.length + fileIds.length + folderIds.length > MAX_BULK_DOWNLOAD_SELECTION_IDS) {
      throw new BadRequestError(`Select ${MAX_BULK_DOWNLOAD_SELECTION_IDS} items or fewer at once`);
    }

    pruneExpiredBulkDownloadTickets();

    const entries = await this.fileService.getBulkDownloadEntries(userId, {
      itemIds,
      fileIds,
      folderIds,
    });
    const summary = summarizeBulkDownloadEntries(entries);
    console.info(
      `[BulkDownload] ticket prepared: requested=${itemIds.length + fileIds.length + folderIds.length} files=${summary.fileCount} folders=${summary.folderCount} entries=${entries.length} bytes=${summary.totalBytes.toString()}`
    );
    const ticket = randomUUID();
    bulkDownloadTickets.set(ticket, {
      userId,
      entries,
      ...summary,
      expiresAt: Date.now() + BULK_DOWNLOAD_TICKET_TTL_MS,
    });

    res.json({
      success: true,
      data: {
        url: `/api/files/download-bulk/${ticket}`,
        expiresIn: Math.floor(BULK_DOWNLOAD_TICKET_TTL_MS / 1000),
        fileCount: summary.fileCount,
        folderCount: summary.folderCount,
        entryCount: entries.length,
        totalBytes: summary.totalBytes.toString(),
      },
    });
  };

  bulkDownload = async (
    req: any,
    res: Response
  ): Promise<void> => {
    pruneExpiredBulkDownloadTickets();

    const ticket = bulkDownloadTickets.get(req.params.ticket);
    if (!ticket || ticket.expiresAt <= Date.now()) {
      throw new NotFoundError("Bulk download link expired");
    }

    const entries = ticket.entries;

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const archiveName = `nexxcloud-download-${timestamp}.zip`;
    const archive = new ZipArchive({
      forceZip64: true,
      store: true,
      zlib: { level: 0 },
    });

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${archiveName}"; filename*=UTF-8''${encodeURIComponent(archiveName)}`);
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Archive-Entries", entries.length.toString());
    res.setHeader("X-Archive-Files", ticket.fileCount.toString());
    res.setHeader("X-Archive-Folders", ticket.folderCount.toString());
    res.setHeader("X-Download-Uncompressed-Size", ticket.totalBytes.toString());

    archive.on("warning", (error) => {
      console.warn("[BulkDownload] Archive warning:", error);
    });
    archive.on("error", (error) => {
      console.error("[BulkDownload] Archive failed:", error);
      if (!res.headersSent) {
        res.status(500).end("Archive failed");
      } else {
        res.destroy(error);
      }
    });

    archive.pipe(res);

    for (const entry of entries) {
      if (entry.type === "directory") {
        archive.append("", { name: entry.archivePath });
        continue;
      }

      archive.file(path.resolve(entry.file.path), {
        name: entry.archivePath,
        date: entry.file.updatedAt,
      });
    }

    await archive.finalize();
  };

  update = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const userId = req.user!.id;
    const { id } = req.params;
    const { originalName } = req.body;

    const file = await this.fileService.update(userId, id, originalName);

    res.status(200).json({
      success: true,
      data: file,
      message: "File renamed successfully",
    });
  };

  delete = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const userId = req.user!.id;
    const { id } = req.params;

    await this.fileService.delete(userId, id);

    res.status(200).json({
      success: true,
      message: "File deleted successfully",
    });
  };

  recent = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const userId = req.user!.id;
    const limit = parseInt(req.query.limit as string) || 10;

    const files = await this.fileService.getRecentFiles(userId, limit);

    res.status(200).json({
      success: true,
      data: files,
    });
  };

  favorites = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const userId = req.user!.id;

    const files = await this.fileService.getFavorites(userId);

    res.status(200).json({
      success: true,
      data: files,
    });
  };

  toggleFavorite = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const userId = req.user!.id;
    const { id } = req.params;

    const file = await this.fileService.toggleFavorite(userId, id);

    res.status(200).json({
      success: true,
      data: file,
      message: file.isFavorite ? "Added to favorites" : "Removed from favorites",
    });
  };

  getThumbnail = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const userId = req.user!.id;
    const { id } = req.params;
    const size = (req.query.size as string) || "medium";

    console.log(`[Thumbnail] Request for file ${id}, size: ${size}, userId: ${userId}`);
    const file = await this.fileService.findById(userId, id);
    console.log(`[Thumbnail] File found, thumbnailSmall: ${file.thumbnailSmall}, thumbnailMedium: ${file.thumbnailMedium}, thumbnailLarge: ${file.thumbnailLarge}`);

    let thumbnailPath: string | null = null;
    switch (size) {
      case "small":
        thumbnailPath = file.thumbnailSmall;
        break;
      case "large":
        thumbnailPath = file.thumbnailLarge;
        break;
      default:
        thumbnailPath = file.thumbnailMedium || file.thumbnail;
    }

    console.log(`[Thumbnail] Selected path: ${thumbnailPath}`);
    if (thumbnailPath) {
      console.log(`[Thumbnail] File exists: ${fs.existsSync(thumbnailPath)}`);
    }

    if (!thumbnailPath || !fs.existsSync(thumbnailPath)) {
      console.log(`[Thumbnail] Thumbnail not found at path: ${thumbnailPath}`);
      throw new NotFoundError("Thumbnail not found");
    }

    // Enforce path traversal defense
    if (!storageService.isSafePath(userId, thumbnailPath)) {
      throw new ForbiddenError("Access denied: Invalid thumbnail path");
    }

    res.setHeader("Cache-Control", "public, max-age=86400");
    res.setHeader("Content-Type", "image/jpeg");
    res.sendFile(path.resolve(thumbnailPath));
  };

  move = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const userId = req.user!.id;
    const { id } = req.params;
    const { folderId } = req.body;

    const file = await this.fileService.move(userId, id, folderId || null);

    res.json({
      success: true,
      data: file,
    });
  };

  stream = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const userId = req.user!.id;
    const { id } = req.params;

    const file = await this.fileService.findById(userId, id);
    const filePath = await this.fileService.getFilePath(userId, id);

    // Enforce path traversal defense
    if (!storageService.isSafePathGlobal(filePath)) {
      throw new ForbiddenError("Access denied: Invalid file path");
    }

    if (!fs.existsSync(filePath)) {
      throw new NotFoundError("File not found on disk");
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (shouldSandbox(file.mimeType, file.extension)) {
      res.setHeader("Content-Security-Policy", "default-src 'none'; sandbox;");
    }

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end < start || end >= fileSize) {
        res.status(416).end();
        return;
      }
      const chunksize = end - start + 1;

      res.status(206);
      res.setHeader("Content-Range", `bytes ${start}-${end}/${fileSize}`);
      res.setHeader("Accept-Ranges", "bytes");
      res.setHeader("Content-Length", chunksize);
      res.setHeader("Content-Type", file.mimeType);
      res.setHeader("Cache-Control", "public, max-age=3600");

      const stream = fs.createReadStream(filePath, { start, end });
      stream.on("error", () => { try { res.end(); } catch {} });
      stream.pipe(res);
    } else {
      res.status(200);
      res.setHeader("Content-Length", fileSize);
      res.setHeader("Content-Type", file.mimeType);
      res.setHeader("Accept-Ranges", "bytes");
      res.setHeader("Cache-Control", "public, max-age=3600");

      const stream = fs.createReadStream(filePath);
      stream.on("error", () => { try { res.end(); } catch {} });
      stream.pipe(res);
    }
  };

  trash = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const userId = req.user!.id;
    const file = await this.fileService.trash(userId, req.params.id);
    res.json({ success: true, data: file });
  };

  restore = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const userId = req.user!.id;
    const file = await this.fileService.restore(userId, req.params.id);
    res.json({ success: true, data: file });
  };

  permanentDelete = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const userId = req.user!.id;
    await this.fileService.permanentDelete(userId, req.params.id);
    res.json({ success: true, message: "File permanently deleted" });
  };

  listTrash = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const userId = req.user!.id;
    const files = await this.fileService.listTrash(userId);
    res.json({ success: true, data: files });
  };

  emptyTrash = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const userId = req.user!.id;
    await this.fileService.emptyTrash(userId);
    res.json({ success: true, message: "Trash emptied" });
  };

  copy = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const userId = req.user!.id;
    const { id } = req.params;
    const { folderId } = req.body;
    const file = await this.fileService.copy(userId, id, folderId || null);
    res.json({ success: true, data: file });
  };

  duplicate = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const userId = req.user!.id;
    const { id } = req.params;
    const file = await this.fileService.copy(userId, id, null);
    res.json({ success: true, data: file });
  };

  bulkAction = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const userId = req.user!.id;
    const { action, fileIds, targetFolderId } = req.body;

    if (!action || !fileIds || !Array.isArray(fileIds)) {
      throw new BadRequestError("action and fileIds are required");
    }

    let result: number;
    switch (action) {
      case "trash":
        result = await this.fileService.bulkTrash(userId, fileIds);
        break;
      case "restore":
        result = await this.fileService.bulkRestore(userId, fileIds);
        break;
      case "move":
        result = await this.fileService.bulkMove(userId, fileIds, targetFolderId || null);
        break;
      case "copy":
        result = await this.fileService.bulkCopy(userId, fileIds, targetFolderId || null);
        break;
      default:
        throw new BadRequestError(`Unknown action: ${action}`);
    }

    res.json({ success: true, data: { processed: result } });
  };
}
