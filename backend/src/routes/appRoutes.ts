import { Router } from "express";
import { prisma } from "../db";
import { AppsController } from "../controllers/appsController";
import { authenticate } from "../middleware/auth";
import { AppsService } from "../services/appsService";

const router = Router();
const appsService = new AppsService(prisma);
const appsController = new AppsController(appsService);

const asyncHandler = (fn: any) => (req: any, res: any, next: any) =>
  Promise.resolve(fn(req, res, next)).catch(next);

router.use(authenticate);

router.get("/docker/status", asyncHandler(appsController.dockerStatus));
router.get("/marketplace", asyncHandler(appsController.marketplace));
router.post("/marketplace/analyze", asyncHandler(appsController.analyze));
router.get("/marketplace/:namespace/:repository", asyncHandler(appsController.marketplaceDetails));

router.get("/installed", asyncHandler(appsController.installed));
router.get("/installed/:id", asyncHandler(appsController.installedById));
router.get("/installed/:id/logs", asyncHandler(appsController.logs));

router.post("/install", asyncHandler(appsController.install));
router.post("/installed/:id/:action", asyncHandler(appsController.action));

export default router;
