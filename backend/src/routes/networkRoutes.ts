import { Router } from "express";
import { NetworkController } from "../controllers/networkController";
import { authenticate } from "../middleware/auth";

const router = Router();
const controller = new NetworkController();

router.get("/status", authenticate, controller.getStatus.bind(controller));

export default router;
