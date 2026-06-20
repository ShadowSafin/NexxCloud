import multer from "multer";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { storageService } from "../services/storageService";
import { BadRequestError } from "../utils/errors";
import { config } from "../config";

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const userId = (req as any).user?.id;
    if (!userId) {
      cb(new BadRequestError("User not authenticated"), "");
      return;
    }
    try {
      await storageService.ensureUserDirectories(userId);
      const dest = path.join(storageService.getUserUploadsPath(userId), "incoming");
      const fs = require("fs");
      if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
      }
      cb(null, dest);
    } catch (error) {
      cb(error as Error, "");
    }
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

export const upload = multer({
  storage,
  limits: {
    fileSize: config.maxFileSize,
    files: 100,
  },
});
