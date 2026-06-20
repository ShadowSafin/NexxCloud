import { Router } from "express";
import path from "path";
import fs from "fs";
import { authenticate } from "../middleware/auth";
import { shareService } from "../services/shareService";
import { AuthenticatedRequest } from "../types";
import { storageService } from "../services/storageService";
import { fileTypeService } from "../services/fileTypeService";
import { ForbiddenError } from "../utils/errors";

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

const router = Router();

const asyncHandler = (fn: any) => (req: any, res: any, next: any) => Promise.resolve(fn(req, res, next)).catch(next);

// Public routes (no auth required)
router.get("/public/:token", asyncHandler(async (req: any, res: any) => {
  const { token } = req.params;
  const { password } = req.query;
  const result = await shareService.findByToken(token, password as string | undefined);
  res.json({ success: true, data: result });
}));

router.get("/public/:token/download", asyncHandler(async (req: any, res: any) => {
  const { token } = req.params;
  const { password } = req.query;
  const { filePath, file } = await shareService.getSharedFilePath(token, password as string | undefined);

  // Enforce path traversal defense
  if (!storageService.isSafePathGlobal(filePath)) {
    throw new ForbiddenError("Access denied: Invalid file path");
  }

  if (!fs.existsSync(filePath)) {
    res.status(404).json({ success: false, error: "File not found" });
    return;
  }

  if (shouldSandbox(file.mimeType, file.extension)) {
    res.setHeader("Content-Security-Policy", "default-src 'none'; sandbox;");
  }

  res.setHeader("Content-Type", file.mimeType);
  res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(file.originalName)}"`);
  res.sendFile(path.resolve(filePath));
}));

router.get("/public/:token/stream", asyncHandler(async (req: any, res: any) => {
  const { token } = req.params;
  const { password } = req.query;
  const { filePath, file } = await shareService.getSharedFilePath(token, password as string | undefined);

  // Enforce path traversal defense
  if (!storageService.isSafePathGlobal(filePath)) {
    throw new ForbiddenError("Access denied: Invalid file path");
  }

  if (!fs.existsSync(filePath)) {
    res.status(404).json({ success: false, error: "File not found" });
    return;
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
    const chunksize = end - start + 1;
    res.status(206);
    res.setHeader("Content-Range", `bytes ${start}-${end}/${fileSize}`);
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Content-Length", chunksize);
    res.setHeader("Content-Type", file.mimeType);
    fs.createReadStream(filePath, { start, end }).pipe(res);
  } else {
    res.setHeader("Content-Length", fileSize);
    res.setHeader("Content-Type", file.mimeType);
    res.setHeader("Accept-Ranges", "bytes");
    fs.createReadStream(filePath).pipe(res);
  }
}));

// Authenticated routes
router.post("/", authenticate, asyncHandler(async (req: AuthenticatedRequest, res: any) => {
  const userId = req.user!.id;
  const { fileId, password, expiresIn } = req.body;
  const share = await shareService.create(userId, fileId, { password, expiresIn });
  res.status(201).json({ success: true, data: share });
}));

router.get("/file/:fileId", authenticate, asyncHandler(async (req: AuthenticatedRequest, res: any) => {
  const userId = req.user!.id;
  const { fileId } = req.params;
  const shares = await shareService.findByFileId(userId, fileId);
  res.json({ success: true, data: shares });
}));

router.delete("/:id", authenticate, asyncHandler(async (req: AuthenticatedRequest, res: any) => {
  const userId = req.user!.id;
  const { id } = req.params;
  await shareService.delete(userId, id);
  res.json({ success: true, message: "Share deleted successfully" });
}));

export default router;
