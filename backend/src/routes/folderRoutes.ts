import { Router } from "express";
import { FolderController } from "../controllers/folderController";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { createFolderSchema, updateFolderSchema } from "../utils/validators";
import { FolderService } from "../services/folderService";
import { prisma } from "../db";

const router = Router();
const folderService = new FolderService(prisma);
const folderController = new FolderController(folderService);

const asyncHandler = (fn: any) => (req: any, res: any, next: any) => Promise.resolve(fn(req, res, next)).catch(next);

router.post("/", authenticate, validate(createFolderSchema), asyncHandler(folderController.create));
router.get("/", authenticate, asyncHandler(folderController.findAll));
router.get("/tree", authenticate, asyncHandler(folderController.findTree));
router.get("/trash", authenticate, asyncHandler(folderController.listTrash));
router.get("/:id/breadcrumb", authenticate, asyncHandler(folderController.findBreadcrumb));
router.patch("/:id", authenticate, validate(updateFolderSchema), asyncHandler(folderController.update));
router.patch("/:id/move", authenticate, asyncHandler(folderController.move));
router.post("/:id/copy", authenticate, asyncHandler(folderController.copy));
router.patch("/:id/trash", authenticate, asyncHandler(folderController.trash));
router.patch("/:id/restore", authenticate, asyncHandler(folderController.restore));
router.delete("/:id", authenticate, asyncHandler(folderController.delete));
router.delete("/:id/permanent", authenticate, asyncHandler(folderController.permanentDelete));

export default router;
