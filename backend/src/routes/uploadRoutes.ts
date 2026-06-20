import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { UploadController } from "../controllers/uploadController";
import { UploadService } from "../services/uploadService";
import { authenticate } from "../middleware/auth";
import { prisma } from "../db";
import { storageService } from "../services/storageService";
import { rateLimitPerUser } from "../middleware/rateLimitPerUser";
import { config } from "../config";

const router = Router();
const uploadService = new UploadService(prisma);
const uploadController = new UploadController(uploadService);
const initiateUploadLimiter = rateLimitPerUser({
  windowMs: 60_000,
  max: config.maxUploadsPerMinute,
  keyPrefix: "chunk-upload-initiate",
  message: "Too many uploads. Please slow down and try again.",
});
const chunkUploadLimiter = rateLimitPerUser({
  windowMs: 60_000,
  max: Math.max(config.maxUploadsPerMinute * 20, config.maxUploadsPerMinute),
  keyPrefix: "chunk-upload",
  message: "Too many upload chunks. Please slow down and try again.",
});

const chunkUpload = multer({
  storage: multer.diskStorage({
    destination: async (req, _file, cb) => {
      try {
        const userId = (req as any).user?.id;
        if (!userId) return cb(new Error("User not authenticated"), "");
        await storageService.ensureUserDirectories(userId);
        const dir = path.join(storageService.getUserUploadsPath(userId), "chunks-tmp");
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
      } catch (error) {
        cb(error as Error, "");
      }
    },
    filename: (_req, _file, cb) => {
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}.chunk`);
    },
  }),
  limits: {
    fileSize: config.maxUploadChunkSize,
    files: 1,
  },
});

const asyncHandler = (fn: any) => (req: any, res: any, next: any) => Promise.resolve(fn(req, res, next)).catch(next);

router.post("/initiate", authenticate, initiateUploadLimiter, asyncHandler(uploadController.initiate));
router.post("/:sessionId/chunk/:chunkIndex", authenticate, chunkUploadLimiter, chunkUpload.single("chunk"), asyncHandler(uploadController.uploadChunk));
router.post("/:sessionId/complete", authenticate, asyncHandler(uploadController.complete));
router.post("/:sessionId/cancel", authenticate, asyncHandler(uploadController.cancel));
router.get("/status/:sessionId", authenticate, asyncHandler(uploadController.getStatus));
router.get("/sessions", authenticate, asyncHandler(uploadController.listSessions));
router.get("/:sessionId/resume", authenticate, asyncHandler(uploadController.resume));
router.get("/session/:id", authenticate, asyncHandler(uploadController.getSessionUploadedChunks));

export default router;
