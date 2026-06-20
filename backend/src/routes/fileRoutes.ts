import { Router } from "express";
import { FileController } from "../controllers/fileController";
import { authenticate } from "../middleware/auth";
import { validate, validateQuery } from "../middleware/validate";
import { upload } from "../middleware/upload";
import { validateUpload } from "../middleware/uploadValidation";
import { rateLimitPerUser } from "../middleware/rateLimitPerUser";
import { fileQuerySchema, updateFileSchema } from "../utils/validators";
import { FileService } from "../services/fileService";
import { storageService } from "../services/storageService";
import { prisma } from "../db";
import { config } from "../config";

const router = Router();
const fileService = new FileService(prisma);
const fileController = new FileController(fileService);
const uploadLimiter = rateLimitPerUser({
  windowMs: 60_000,
  max: config.maxUploadsPerMinute,
  keyPrefix: "file-upload",
  message: "Too many uploads. Please slow down and try again.",
});

const asyncHandler = (fn: any) => (req: any, res: any, next: any) => Promise.resolve(fn(req, res, next)).catch(next);

// Storage stats endpoint
router.get("/storage", authenticate, asyncHandler(async (req: any, res: any) => {
  const userId = req.user!.id;
  const userStats = await storageService.getStorageStats(userId);
  const diskStats = await storageService.getDiskStats();
  const storageInfo = await storageService.getStorageInfo(userId);
  res.json({
    success: true,
    data: {
      used: userStats.used,
      fileCount: userStats.fileCount,
      totalDisk: diskStats.totalDisk,
      freeDisk: diskStats.freeDisk,
      availableDisk: diskStats.availableDisk,
      trashSize: storageInfo.trashSize,
    },
  });
}));

router.post("/upload", authenticate, uploadLimiter, upload.single("file"), asyncHandler(validateUpload), asyncHandler(fileController.upload));
router.post("/upload-multiple", authenticate, uploadLimiter, upload.array("files", 100), asyncHandler(fileController.uploadMultiple));
router.post("/bulk", authenticate, asyncHandler(fileController.bulkAction));
router.post("/download-bulk/sign", authenticate, asyncHandler(fileController.createBulkDownloadTicket));
router.get("/download-bulk/:ticket", asyncHandler(fileController.bulkDownload));

router.get("/", authenticate, validateQuery(fileQuerySchema), asyncHandler(fileController.findAll));
router.get("/recent", authenticate, asyncHandler(fileController.recent));
router.get("/favorites", authenticate, asyncHandler(fileController.favorites));
router.get("/trash", authenticate, asyncHandler(fileController.listTrash));
router.post("/trash/empty", authenticate, asyncHandler(fileController.emptyTrash));
router.get("/:id", authenticate, asyncHandler(fileController.findById));
router.get("/:id/download", authenticate, asyncHandler(fileController.download));
router.get("/:id/stream", authenticate, asyncHandler(fileController.stream));
router.get("/:id/thumbnail", authenticate, asyncHandler(fileController.getThumbnail));
router.patch("/:id", authenticate, validate(updateFileSchema), asyncHandler(fileController.update));
router.patch("/:id/move", authenticate, asyncHandler(fileController.move));
router.post("/:id/copy", authenticate, asyncHandler(fileController.copy));
router.post("/:id/duplicate", authenticate, asyncHandler(fileController.duplicate));
router.patch("/:id/favorite", authenticate, asyncHandler(fileController.toggleFavorite));
router.patch("/:id/trash", authenticate, asyncHandler(fileController.trash));
router.patch("/:id/restore", authenticate, asyncHandler(fileController.restore));
router.delete("/:id", authenticate, asyncHandler(fileController.delete));
router.delete("/:id/permanent", authenticate, asyncHandler(fileController.permanentDelete));

export default router;
