import { Router } from "express";
import path from "path";
import fs from "fs";
import { prisma } from "../db";
import { authenticate } from "../middleware/auth";
import { AuthenticatedRequest } from "../types";
import { mediaAccessService, MediaAccessType } from "../services/mediaAccessService";
import { FileService } from "../services/fileService";
import { storageService } from "../services/storageService";
import { fileTypeService } from "../services/fileTypeService";
import { BadRequestError, ForbiddenError, NotFoundError } from "../utils/errors";

const router = Router();
const fileService = new FileService(prisma);
const asyncHandler = (fn: any) => (req: any, res: any, next: any) => Promise.resolve(fn(req, res, next)).catch(next);

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
    [".html", ".htm", ".svg", ".xml", ".js", ".json"].includes(ext)
  );
};

router.post("/sign", authenticate, asyncHandler(async (req: AuthenticatedRequest, res: any) => {
  const userId = req.user!.id;
  const { fileId, type, size } = req.body as {
    fileId?: string;
    type?: MediaAccessType;
    size?: "small" | "medium" | "large";
  };

  if (!fileId || !type || !["stream", "download", "thumbnail"].includes(type)) {
    throw new BadRequestError("fileId and valid type are required");
  }

  await fileService.findById(userId, fileId);
  const token = mediaAccessService.createToken({ fileId, userId, type, size });

  res.json({
    success: true,
    data: {
      url: `/api/media/${token}`,
      expiresIn: 300,
    },
  });
}));

router.get("/:token", asyncHandler(async (req: any, res: any) => {
  const payload = mediaAccessService.verifyToken(req.params.token);
  const file = await fileService.findById(payload.userId, payload.fileId);

  if (payload.type === "thumbnail") {
    const size = payload.size || "medium";
    const thumbnailPath =
      size === "small" ? file.thumbnailSmall :
      size === "large" ? file.thumbnailLarge :
      file.thumbnailMedium || file.thumbnail;

    if (!thumbnailPath || !fs.existsSync(thumbnailPath)) {
      throw new NotFoundError("Thumbnail not found");
    }
    if (!storageService.isSafePath(payload.userId, thumbnailPath)) {
      throw new ForbiddenError("Access denied: Invalid thumbnail path");
    }

    res.setHeader("Cache-Control", "private, max-age=300");
    res.setHeader("Content-Type", "image/jpeg");
    return res.sendFile(path.resolve(thumbnailPath));
  }

  const filePath = await fileService.getFilePath(payload.userId, payload.fileId);
  if (!storageService.isSafePathGlobal(filePath)) {
    throw new ForbiddenError("Access denied: Invalid file path");
  }
  if (!fs.existsSync(filePath)) {
    throw new NotFoundError("File not found on disk");
  }

  if (shouldSandbox(file.mimeType, file.extension)) {
    res.setHeader("Content-Security-Policy", "default-src 'none'; sandbox;");
  }

  if (payload.type === "download") {
    res.setHeader("Content-Type", file.mimeType);
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(file.originalName)}"`);
    return res.sendFile(path.resolve(filePath));
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("Cache-Control", "private, max-age=300");
  res.setHeader("Content-Type", file.mimeType);

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end < start || end >= fileSize) {
      res.status(416).end();
      return;
    }

    res.status(206);
    res.setHeader("Content-Range", `bytes ${start}-${end}/${fileSize}`);
    res.setHeader("Content-Length", end - start + 1);
    return fs.createReadStream(filePath, { start, end }).pipe(res);
  }

  res.setHeader("Content-Length", fileSize);
  fs.createReadStream(filePath).pipe(res);
}));

export default router;
