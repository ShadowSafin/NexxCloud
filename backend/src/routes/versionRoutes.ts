import { Router } from "express";
import { VersionController } from "../controllers/versionController";
import { VersionService } from "../services/versionService";
import { authenticate } from "../middleware/auth";
import { prisma } from "../db";

const router = Router();
const versionService = new VersionService(prisma);
const versionController = new VersionController(versionService);

const asyncHandler = (fn: any) => (req: any, res: any, next: any) => Promise.resolve(fn(req, res, next)).catch(next);

router.post("/:fileId", authenticate, asyncHandler(versionController.create));
router.get("/:fileId", authenticate, asyncHandler(versionController.list));
router.post("/:fileId/restore/:versionNumber", authenticate, asyncHandler(versionController.restore));
router.delete("/:fileId/:versionNumber", authenticate, asyncHandler(versionController.delete));

export default router;
